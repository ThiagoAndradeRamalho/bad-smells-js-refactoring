const USER_VALUE_LIMIT = 500;
const ADMIN_PRIORITY_THRESHOLD = 1000;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const Formatters = {
  CSV: {
    header: () => 'ID,NOME,VALOR,USUARIO\n',
    row: (item, meta, user) =>
      `${item.id},${item.name},${item.value},${user.name}\n`,
    footer: (total) => `\nTotal,,\n${total},,\n`,
  },
  HTML: {
    header: (user) =>
      `<html><body>
        <h1>Relatório</h1>
        <h2>Usuário: ${escapeHtml(user.name)}</h2>
        <table>
        <tr><th>ID</th><th>Nome</th><th>Valor</th></tr>
        `,
            row: (item, meta) => {
              const style = meta.priority ? ' style="font-weight:bold;"' : '';
              return `<tr${style}><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.value)}</td></tr>\n`;
            },
            footer: (total) =>
              `</table>
        <h3>Total: ${total}</h3>
        </body></html>
      `,
  },
};


const Policies = {
  ADMIN: {
    canSee: () => true,
    meta: (item) => ({ priority: item.value > ADMIN_PRIORITY_THRESHOLD }),
  },
  USER: {
    canSee: (item) => item.value <= USER_VALUE_LIMIT,
    meta: () => ({ priority: false }),
  },
};

export class ReportGenerator {
  constructor(database, { formatters = Formatters, policies = Policies } = {}) {
    this.db = database;
    this.formatters = formatters;
    this.policies = policies;
  }

  generateReport(reportType, user, items) {
    const fmt = this._getFormatter(reportType);
    const policy = this._getPolicy(user.role);

    let total = 0;
    const parts = [];

    parts.push(fmt.header(user));

    for (const item of items) {
      if (!policy.canSee(item)) continue;
      const meta = policy.meta(item);
      parts.push(fmt.row(item, meta, user));
      total += item.value;
    }

    parts.push(fmt.footer(total));
    return parts.join('').trim();
  }

  _getFormatter(reportType) {
    return this.formatters[reportType] || this.formatters.CSV;
  }
  _getPolicy(role) {
    return this.policies[role] || this.policies.USER;
  }
}
