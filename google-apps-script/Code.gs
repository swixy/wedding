/**
 * RSVP → Google Таблица
 *
 * Настройка (один раз):
 * 1. Создайте Google Таблицу (например «Свадьба — RSVP»).
 * 2. Расширения → Apps Script, вставьте этот код, сохраните.
 * 3. Запустите setupSheet() — разрешите доступ к таблице.
 * 4. Развернуть → Новое развертывание → тип «Веб-приложение»:
 *    - Выполнять от имени: «Я»
 *    - У кого есть доступ: «Все»
 * 5. Скопируйте URL развертывания в FORM_ENDPOINT в script.js на сайте.
 */

const SHEET_NAME = 'Ответы';

const HEADERS = [
  'Дата и время',
  'Имя и фамилия',
  'Присутствие',
  'Точно буду пить',
  'Наверное буду пить',
  'Точно не буду пить',
  'Трансфер',
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = getSheet_();

    sheet.appendRow([
      payload.submitted_at || new Date().toISOString(),
      payload.name || '',
      payload.attendance || '',
      payload.drinks_yes || '',
      payload.drinks_maybe || '',
      payload.drinks_no || '',
      payload.transfer || '',
    ]);

    return jsonResponse_({ ok: true });
  } catch (error) {
    return jsonResponse_({ ok: false, error: String(error) });
  }
}

function doGet() {
  return ContentService
    .createTextOutput('RSVP webhook работает.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function setupSheet() {
  const sheet = getSheet_();
  sheet.autoResizeColumns(1, HEADERS.length);
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
