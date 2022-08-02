import { getTranslation, isLanguageSupported } from "./i18n/index.js";

const platformIcons = {
    exe: "fa-windows",
    app: "fa-apple",
    deb: "fa-ubuntu",
    rpm: "fa-linux",
    appImage: "fa-linux"
}

function getLang() {
    if (window.localStorage.getItem("lang")) {
        return window.localStorage.getItem("lang");
    }
    if (window.navigator.languages !== undefined && window.navigator.languages.length > 0) {
        return window.navigator.languages[0].split("-")[0].toLowerCase();
    }
    return window.navigator.language.split("-")[0].toLowerCase();
}

function setLang(lang) {
    window.localStorage.setItem("lang", lang)
}

function changeLang(lang) {
    for (const child of document.getElementsByClassName("languageSelector")[0].children) {
        child.className = child.id === lang ? "enabled" : "";
    }
    setLang(lang);
    updateMainPage();
}

window.changeLang = changeLang;

if (!isLanguageSupported(getLang())) {
    setLang("en");
}

function updateMainPage() {
    if (!window.abitikkuReleases) return;
    const lang = getLang();
    document.getElementById("section1").innerText = getTranslation(lang, "mainPage.section1");
    document.getElementById("section2").innerHTML = getTranslation(lang, "mainPage.section2");
    document.getElementById("section3").innerHTML = getTranslation(lang, "mainPage.section3");

    document.getElementById("footer1").innerHTML = getTranslation(lang, "mainPage.footer1");
    document.getElementById("footer3").innerText = getTranslation(lang, "mainPage.footer3");

    updateLinks(window.abitikkuReleases.tag_name, window.abitikkuReleases.downloadLinks);
}

// what the fuck is style of the following code
// burn it 😭
function updateLinks(version, downloadLinks) {
    const lang = getLang();
    Sniffr.sniff(window.navigator.userAgent);
    let osInfo = Sniffr.os;
    let url = downloadLinks.exe;
    let nameInfo = getTranslation(lang, "download.download");
    let icon = "fa-windows";

    if (osInfo.name === "linux") {
        url = downloadLinks.appImage,
            icon = platformIcons.appImage;

        if (window.navigator.userAgent.toLowerCase().includes("ubuntu") || window.navigator.userAgent.toLowerCase().includes("deb")) {
            url = downloadLinks.deb,
                icon = platformIcons.deb,
                nameInfo += getTranslation(lang, "download.ubuntu");
        } else if (window.navigator.userAgent.toLowerCase().includes("arch")) {
            url = downloadLinks.rpm,
                icon = platformIcons.rpm,
                nameInfo += getTranslation(lang, "download.arch");
        } else {
            url = downloadLinks.appImage,
                icon = platformIcons.appImage,
                nameInfo += getTranslation(lang, "download.linux");
        }
    } else if (osInfo.name === "windows") {
        url = downloadLinks.exe,
            icon = platformIcons.exe,
            nameInfo += getTranslation(lang, "download.windows");
    } else if (osInfo.name === "macos") {
        url = downloadLinks.app,
            icon = platformIcons.app,
            nameInfo += getTranslation(lang, "download.macos");
    }

    let downloadText = document.getElementById("downloadText");
    let downloadLink = document.getElementById("downloadLink");
    let otherDownloads = document.getElementById("otherDownloads");
    let versionText = document.getElementById("versionText");
    let downloadIcon = document.querySelector(".fab");

    downloadIcon.className = `fab ${icon}` // clearing out the initial icon

    downloadLink.href = url;
    downloadText.innerHTML = nameInfo;
    versionText.innerHTML = `${getTranslation(lang, "mainPage.version")}${version}.`;
    otherDownloads.innerText = getTranslation(lang, "download.otherDownloads");
}

fetch("https://api.github.com/repos/testausserveri/abitikku/releases/latest")
    .then(res => res.json())
    .then(({ tag_name, assets }) => {
        if (!assets) alert(getTranslation(getLang(), "mainPage.loadFail") || "Valitettavasti versioiden hakeminen epäonnistui. Pyydämme sinua ottamaan yhteyttä Abitikun tukeen.")

        let downloadLinks = {
            exe: assets.find(asset => asset.name.includes("Setup"))["browser_download_url"],
            app: assets.find(asset => asset.name.endsWith(".app.zip"))["browser_download_url"],
            deb: assets.find(asset => asset.name.endsWith(".deb"))["browser_download_url"],
            rpm: assets.find(asset => asset.name.endsWith(".rpm"))["browser_download_url"],
            appImage: assets.find(asset => asset.name.endsWith(".AppImage"))["browser_download_url"]
        }

        console.log(`Found the following download links from the latest release (${tag_name})`, downloadLinks)

        window.abitikkuReleases = {
            tag_name,
            downloadLinks
        };

        updateLinks(tag_name, downloadLinks)
        changeLang(getLang()) // sets the enabled class to the right button
    })
