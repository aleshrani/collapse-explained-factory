# Výrobní PC: jednorázové spuštění

Herní PC (i7-8700, RTX 2080 8 GB, 16 GB RAM, Windows 10 Home) po jednom spuštění sám vyrábí díly. Pak se na něj nesahá.

## Spuštění (jednou)
1. Přihlásit se do Windows účtem, který zůstane přihlášený (nebo zapnout automatické přihlášení).
2. Otevřít PowerShell (Start → napsat `powershell` → Enter) a vložit:

```powershell
winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements; $env:Path += ";C:\Program Files\Git\cmd"; git clone https://github.com/aleshrani/collapse-explained-factory C:\CollapseExplained; powershell -ExecutionPolicy Bypass -File C:\CollapseExplained\setup.ps1
```

3. Windows se několikrát zeptá na oprávnění instalace → Ano. Jednou se otevře prohlížeč s přihlášením na GitHub (účet aleshrani) a kódem z okna PowerShellu → potvrdit. Přes to PC posílá stav a hotová videa.
4. Hotovo, až se objeví zeleně „Factory started“. Když se objeví červeně „SETUP STOPPED“, opravit uvedenou věc a spustit `setup.ps1` znovu (hotové kroky přeskočí).

Instalace trvá desítky minut (programy, ~1 GB hlasových modelů, ~14 GB modelů Ollama, test 60 s dílu 1). Potřeba ~50 GB místa.

## Co pak PC dělá samo
- Po každém přihlášení spustí na pozadí `factory.ps1 -Watch` (naplánovaná úloha, sama se restartuje); když se změní factory.ps1, sama se aktualizuje; každých 30 min stáhne z GitHubu nové scénáře a kity.
- Vyrobí každý díl, který má `narration.md` a ještě nemá `episode.mp4`: hlas (Kokoro), časy slov (Parakeet), plán záběrů (Ollama qwen2.5-coder:7b), render, zvuk, kontrolu kvality a 5 shortů.
- Jednou otestuje, jestli model qwen2.5-coder:14b zvládne napsat nové 3D prostředí.
- Stav (logy, QA reporty, kontaktní archy) posílá do větve `factory-status` na GitHubu, jen když je PC přihlášené k GitHubu s právem zápisu. Bez přihlášení PC vyrábí dál, jen stav zůstane v `C:\CollapseExplained\factory.log`.
- Veřejné repo obsahuje jen engine, skripty a scénáře. Rešerše, rozbory konkurence a návrhy zůstávají v soukromém repu; do veřejného se kopírují skriptem `tools/publish-factory.sh`.
- Spánek při napájení ze sítě je vypnutý.

## Rizika
- Na PC zůstane přihlášení k GitHubu s přístupem ke všem repům účtu.
- Windows 10 už nedostává bezpečnostní aktualizace a PC poběží 24/7 online.
- Když se PC restartuje a zůstane na přihlašovací obrazovce, výroba stojí až do přihlášení.
