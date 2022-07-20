import fi from "./fi.js";
import en from "./en.js";
import se from "./se.js";

const translations = {
    fi,
    en,
    se,
}

/**
 * @param {string} lang
 * @param {string} key
 * @returns {string}
 */
export function getTranslation(lang, key) {
    const splitKey = key.split(".");
    let current = translations[lang];
    if (!current) return `Missing translations for language "${lang}"`;
    for (const part of splitKey) {
        if (current[part] === undefined) {
            return `Missing translation for key "${key}" for language "${lang}"`;
        }
        current = current[part];
    }
    return current;
}

/**
 * @param {string} lang
 * @returns {boolean}
 */
export function isLanguageSupported(lang) {
    return lang in translations;
}
