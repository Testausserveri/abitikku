#!/usr/bin/env osascript -l JavaScript


ObjC.import('stdlib')

const app = Application.currentApplication()
app.includeStandardAdditions = true

const result = app.displayDialog('Abitikku tarvitsee korotetun oikeuden kirjoittaakseen tikulle.\n\nSyötä salasanasi salliaksesi tämän.', {
  defaultAnswer: '',
  withIcon: 'caution',
  buttons: ['Peruuta', 'Ok'],
  defaultButton: 'Ok',
  hiddenAnswer: true,
})

if (result.buttonReturned === 'Ok') {
  result.textReturned
} else {
  $.exit(255)
}


