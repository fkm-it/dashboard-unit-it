/**
 * @file InviteService.gs
 * Akaun dicipta oleh pentadbir (pendaftaran awam boleh ditutup) + link jemputan untuk menetapkan kata laluan.
 *   - Admin: pengguna biasa & Pengurusan. Super Admin: semua peranan.
 *   - Akaun baharu tiada kata laluan; jemputan diemel (token rawak, hanya hash disimpan dalam PAUTAN_EDIT, sah 7 hari).
 *   - Pentadbir tidak pernah melihat atau menetapkan kata laluan pengguna.
 */
const InviteService = {
  DAYS: 7,
  ROUTE: '#/aktifkan',
  MODUL: 'akaun',

  links_: function () { return Repo.of('PAUTAN_EDIT'); },

  /** Peranan yang boleh diberi oleh pemanggil. */
  assignable: function (ctx) {
    if (ctx.role === ROLES.SUPER_ADMIN) return [ROLES.USER, ROLES.PENGURUSAN, ROLES.ADMIN, ROLES.SUPER_ADMIN];
    return [ROLES.USER, ROLES.PENGURUSAN];
  },

  hasPassword: function (userId) {
    try { return !!CredentialRepository.getHash(userId); } catch (e) { return false; }
  },

  create: function (ctx, payload) {
    const data = Validator.validate(payload, {
      fullName: { type: 'string', required: true, min: 3, max: CONFIG.NAME_MAX, label: 'Nama penuh' },
      email: { type: 'email', required: true, label: 'Email' },
      phone: { type: 'phone', label: 'No. telefon' },
      role: { type: 'enum', values: [ROLES.USER, ROLES.PENGURUSAN, ROLES.ADMIN, ROLES.SUPER_ADMIN], default: ROLES.USER, label: 'Peranan' }
    });
    if (InviteService.assignable(ctx).indexOf(data.role) < 0) throw Errors.forbidden('Hanya Super Admin boleh mencipta akaun Admin.');
    const user = Database.withLock(function () {
      UserRepository.base().invalidate();
      if (UserRepository.findByEmail(data.email)) throw Errors.conflict('Email ini telah didaftarkan.');
      return UserRepository.create({ email: data.email, full_name: data.fullName, phone: data.phone || '', role: data.role });
    });
    AuditService.log(ctx, AUDIT_ACTIONS.USER_REGISTERED, 'USER', user.user_id, 'Dicipta oleh pentadbir (' + data.role + ') · ' + StringUtils.maskEmail(user.email));
    const sent = InviteService.send_(user);
    const dto = UserModel.toAdmin(user);
    dto.pendingInvite = true;
    return { user: dto, inviteSent: sent };
  },

  /** Hantar semula jemputan (link lama dibatalkan). */
  resend: function (ctx, payload) {
    const data = Validator.validate(payload, { userId: { type: 'id', prefix: 'U', required: true, label: 'Pengguna' } });
    const target = UserRepository.findById(data.userId);
    UserService.assertCanManage(ctx, target);
    if (target.status !== USER_STATUS.ACTIVE) throw Errors.validation('Akaun tidak aktif.');
    return { inviteSent: InviteService.send_(target) };
  },

  revoke_: function (userId) {
    const now = DateUtils.nowIso();
    const patch = {};
    InviteService.links_().all().forEach(function (l) {
      if (l.modul === InviteService.MODUL && l.record_id === userId && !l.revoked_at) patch[l.token_hash] = { revoked_at: now };
    });
    if (Object.keys(patch).length) InviteService.links_().updateMany(patch);
  },

  /** @return {boolean} email dihantar */
  send_: function (user) {
    InviteService.revoke_(user.user_id);
    const token = SecurityUtils.randomToken();
    const now = new Date();
    InviteService.links_().insert({
      token_hash: SecurityUtils.sha256Hex(token), modul: InviteService.MODUL, record_id: user.user_id, email: user.email,
      created_at: now.toISOString(), expires_at: DateUtils.addDays(now, InviteService.DAYS).toISOString(), revoked_at: '', used_at: ''
    });
    InviteService.lastToken_ = token;
    const label = { USER: 'Pengguna', PENGURUSAN: 'Pengurusan (baca sahaja)', ADMIN: 'Admin', SUPER_ADMIN: 'Super Admin' }[user.role] || user.role;
    const lines = [
      'Assalamualaikum ' + user.full_name + ',',
      'Akaun anda dalam ' + SettingsService.get('SYSTEM_NAME') + ' telah dicipta oleh Unit IT FKM dengan peranan: ' + label + '.',
      'Tekan butang di bawah untuk menetapkan kata laluan dan mengaktifkan akaun. Link ini sah selama ' + InviteService.DAYS + ' hari dan hanya boleh digunakan sekali.',
      'Selepas itu, log masuk menggunakan email ini: ' + user.email + '.'
    ];
    if (!PushService.baseUrl()) {
      let app = '';
      try { app = ScriptApp.getService().getUrl() || ''; } catch (e) { app = ''; }
      if (app) lines.push('Link pengaktifan: ' + app + InviteService.ROUTE + '?t=' + token);
    }
    return NotificationService.email(user.email, 'Pengaktifan akaun', lines, { force: true, path: InviteService.ROUTE + '?t=' + token });
  },

  /** Baris link sah. @return {{link:Object, user:Object}} */
  resolve_: function (token) {
    const bad = Errors.validation('Link pengaktifan tidak sah atau telah tamat tempoh. Minta pentadbir menghantar semula jemputan.');
    if (!SecurityUtils.isTokenFormat(token)) throw bad;
    const l = InviteService.links_().findById(SecurityUtils.sha256Hex(token));
    if (!l || l.modul !== InviteService.MODUL || l.revoked_at || l.used_at || String(l.expires_at) < DateUtils.nowIso()) throw bad;
    const user = UserRepository.findById(l.record_id);
    if (!user || user.status !== USER_STATUS.ACTIVE) throw bad;
    return { link: l, user: user };
  },

  info: function (payload) {
    SecurityService.rateLimit('auth.activate', String(payload && payload.t || '').slice(0, 12));
    const r = InviteService.resolve_(payload && payload.t);
    return { fullName: r.user.full_name, email: r.user.email };
  },

  activate: function (payload, ctx) {
    const data = Validator.validate(payload, {
      t: { type: 'string', required: true, max: 200, raw: true, label: 'Token' },
      password: { type: 'string', required: true, raw: true, max: CONFIG.PASSWORD_MAX_LENGTH, label: 'Kata laluan' },
      remember: { type: 'boolean', default: false }
    });
    SecurityService.rateLimit('auth.activate', String(data.t).slice(0, 12));
    const r = InviteService.resolve_(data.t);
    Validator.password(data.password, r.user.email);
    CredentialRepository.setHash(r.user.user_id, SecurityUtils.hashPassword(data.password));
    InviteService.links_().update(r.link.token_hash, { used_at: DateUtils.nowIso(), revoked_at: DateUtils.nowIso() });
    AuthService.revokeAllForUser(r.user.user_id);
    const updated = UserRepository.update(r.user.user_id, { last_login_at: DateUtils.nowIso() });
    UserService.invalidate(r.user.user_id);
    AuditService.log({ userId: r.user.user_id, role: r.user.role, userAgent: ctx && ctx.userAgent }, AUDIT_ACTIONS.PASSWORD_RESET, 'AUTH', r.user.user_id, 'Akaun diaktifkan melalui jemputan');
    NotificationService.notify(r.user.user_id, NOTIF_TYPE.WELCOME, 'Selamat datang ke ' + SettingsService.get('SYSTEM_NAME'), 'Akaun anda telah diaktifkan.', '');
    const session = AuthService.createSession(updated, data.remember, ctx && ctx.userAgent);
    return { token: session.token, expiresAt: session.expiresAt, user: UserModel.toSelf(updated) };
  }
};
