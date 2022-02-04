import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from "../../i18n/en.json";
import fi from "../../i18n/fi.json";
import se from "../../i18n/se.json";

export const resources = {
	en: {
		translation: en,
	},
	fi: {
		translation: fi,
	},
	se: {
		translation: se,
	},
};

i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'fi',
    resources,
  });

export default i18n;