![Keun](static/keun_logo.jpg)
===========

**Keun** ([West Flemish](https://en.wikipedia.org/wiki/West_Flemish) for [rabbit](https://anw-ivdnt-org.translate.goog/article/keun?_x_tr_sl=nl&_x_tr_tl=en&_x_tr_hl=nl&_x_tr_pto=wapp)) is a web based modern variant of the [Usagi](https://www.ohdsi.org/web/wiki/doku.php?id=documentation:software:usagi) OMOP [CDM](https://www.ohdsi.org/data-standardization/) mapping tool.

Introduction
============

Although [Usagi](https://www.ohdsi.org/web/wiki/doku.php?id=documentation:software:usagi) does the job, it has some issues:
- It is slow (especially when loading large CSV's)
- You need to install the dictionaries from Athena
- It requires software installation (Java)
- No [four-eye principle](https://en.wiktionary.org/wiki/four-eye_principle)
- It doesn't do translations
- The search result of Usagi are not on par with [Athena](https://athena.ohdsi.org/)

Therefore we decided to make a modern web variant of Usagi:
- No installation, just run it from your browser
- Made with [Svelte](https://svelte.dev/): cybernetically enhanced web apps
- Includes the super fast [svelte-radar-datatable](https://github.com/RADar-AZDelta/svelte-radar-datatable) component. So it can handle very, very lage CSV files. It uses the [Arquero](https://uwdata.github.io/arquero/) library in a web worker.
- Uses [Athena](https://athena.ohdsi.org/) in the background
- Translation are done by [Bergamot](https://browser.mt/): machine translation done locally in your browser

Usage
============

When the CSV file is loaded, the row will be mapped automatically with the first value Athena gives. This mapping is a suggestion and should always be checked.

There are certain options that the user can change. On the upper right side of the page there is a button for the settings.
When this button is clicked, a pop-up will appear with all the settings. At this moment there are two settings: language & multiple mapping.

The multiple mapping choice let's the user choose if he wants to map a row to multiple concepts. If the user maps a row to multiple concepts, this creates extra rows that are inserted in the back of the file.

The language option let's the user choose a language. This is a feature that will be implemented in the future to translate the values to get better results from Athena.

When the user is ready with the mapping, he can download the file with the button on the right upper side of the page.

4-eyes-principal
============

![4-eyes-principal](https://user-images.githubusercontent.com/71939691/236427929-1396d8ee-81ff-4af9-aedb-06666fe5f29b.png)


Development
============

Clone the project

```bash
git clone git@github.com:RADar-AZDelta/Keun.git
cd ./Keun/
pnpm install
```
Start dev server

```bash
pnpm dev
```

License
========

Copyright © 2023 [RADar-AZDelta](mailto:radar@azdelta.be).
Released under the [GNU General Public License v3.0](LICENSE).
