import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("garde les valeurs simples et les nombres", () => {
    expect(csvCell("Douala")).toBe("Douala");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(null)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
  });

  it("entoure de guillemets les cellules contenant séparateur, guillemets ou retour", () => {
    expect(csvCell("Sacs; accessoires")).toBe('"Sacs; accessoires"');
    expect(csvCell('Dit "neuf"')).toBe('"Dit ""neuf"""');
    expect(csvCell("ligne 1\nligne 2")).toBe('"ligne 1\nligne 2"');
  });

  it("neutralise les formules de tableur", () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell("+237 690")).toBe("'+237 690");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell(-5)).toBe("-5");
  });
});

describe("toCsv", () => {
  it("produit un document avec BOM, séparateur point-virgule et fins CRLF", () => {
    expect(toCsv(["jour", "inscriptions"], [["2026-10-25", 3]])).toBe(
      "﻿jour;inscriptions\r\n2026-10-25;3\r\n",
    );
  });
});
