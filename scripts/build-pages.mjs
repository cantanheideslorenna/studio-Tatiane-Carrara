import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_SERVICES, money } from '../src/domain.js';
import { escapeHtml } from '../public/catalog-editor.js';

const output = 'dist/pages';
const index = readFileSync('public/index.html', 'utf8');
const bookingStart = index.indexOf(' <section id="agendar"');
const infoStart = index.indexOf(' <section class="container section studio-info"');
const clientEnd = index.indexOf(' </main>');
if (bookingStart < 0 || infoStart < bookingStart || clientEnd < infoStart) {
  throw new Error('As seções do site público não foram encontradas.');
}

const catalog = DEFAULT_SERVICES.map(service => `
  <div class="col-md-6 col-lg-4">
    <article class="service-card h-100">
      <span class="service-category">${escapeHtml(service.category)}</span>
      <h3>${escapeHtml(service.name)}</h3>
      <p>${escapeHtml(service.description)}</p>
      <span class="service-bottom"><span>${service.duration} min</span><strong>${money(service.price)}</strong></span>
    </article>
  </div>`).join('');

const html = index.slice(0, bookingStart)
  .replace('Escolha seus serviços, consulte horários e envie um orçamento para aprovação do Studio Tatiane Carrara.', 'Conheça os serviços de beleza do Studio Tatiane Carrara em Vila Velha, ES.')
  .replace(' <script type="module" src="/app.js"></script>\n', '')
  .replace('href="/#agendar">Pular para o agendamento', 'href="#servicos">Pular para os serviços')
  .replace('href="/"', 'href="./"')
  .replace('href="/#servicos"', 'href="#servicos"')
  .replace('<a href="/#agendar" class="btn btn-plum btn-sm">Consultar agenda</a>', '')
  .replace('href="#agendar">Escolher meu horário', 'href="#servicos">Ver serviços')
  .replace('<p>Selecione um ou mais serviços.<br>O tempo de cada cuidado será somado.</p>', '')
  .replace('<p>Carregando serviços…</p>', catalog)
  .replace('<div id="selection-total" class="selection-total" aria-live="polite"></div><a href="#agendar" class="btn btn-plum mt-3">Consultar horários para minha seleção</a>', '')
  .replace(/(href|src)="\/(?=(?:images\/|vendor\/|styles\.css))/g, '$1="./')
  + index.slice(infoStart, clientEnd)
    .replace('<h3>Você escolhe. O Studio confirma.</h3><p>Os serviços são analisados individualmente. Confira no acompanhamento quais foram aprovados e o horário final do atendimento.</p>', '<h3>Agendamentos</h3><p>A agenda e a consulta de orçamentos estão indisponíveis neste site.</p>')
  + '\n </main>\n <footer class="footer"><div class="container">Studio Tatiane Carrara</div></footer>\n</body></html>\n';

mkdirSync(output, { recursive: true });
for (const asset of ['images', 'vendor', 'styles.css']) {
  cpSync(`public/${asset}`, `${output}/${asset}`, { recursive: true });
}
writeFileSync(`${output}/index.html`, html);
