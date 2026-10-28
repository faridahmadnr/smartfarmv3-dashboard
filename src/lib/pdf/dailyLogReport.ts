import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReportDailyLog {
    id: string;
    date: string;
    pakan?: number | null;
    minum?: number | null;
    populasi?: number | null;
    bobot?: number | null;
    notes?: string | null;
}

export interface ReportDeath {
    id: string;
    count: number;
    notes?: string | null;
    timestamp: string;
}

export interface ReportMeta {
    kandangName: string;
    kandangCode?: string | null;
    kandangType?: string | null;
    startDate: string;
    endDate: string;
    generatedAt?: Date;
}

export interface ReportOptions {
    includeCharts: boolean;
}

export interface ReportResult {
    blob: Blob;
    pageCount: number;
    size: number;
    logCount: number;
    deathCount: number;
}

type RGB = [number, number, number];

const INK: RGB = [15, 23, 42];
const MUTED: RGB = [100, 116, 139];
const SOFT: RGB = [148, 163, 184];
const LINE: RGB = [226, 232, 240];
const CARD: RGB = [248, 250, 252];
const WHITE: RGB = [255, 255, 255];
const BRAND_DARK: RGB = [5, 46, 34];
const BRAND: RGB = [5, 150, 105];
const BRAND_BRIGHT: RGB = [16, 185, 129];
const MINT: RGB = [236, 253, 245];
const MINT_BORDER: RGB = [167, 243, 208];
const MINT_TEXT: RGB = [6, 78, 59];
const RED: RGB = [220, 38, 38];
const BLUE: RGB = [37, 99, 235];
const AMBER: RGB = [180, 83, 9];

const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = 274;

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function parseIsoDate(iso: string): Date {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function shortDate(iso: string): string {
    const d = parseIsoDate(iso);
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function tableDate(iso: string): string {
    const d = parseIsoDate(iso);
    const weekday = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d.getDay()];
    return `${weekday}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function chartDate(iso: string): string {
    const d = parseIsoDate(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatPeriod(start: string, end: string): string {
    const a = parseIsoDate(start);
    const b = parseIsoDate(end);
    if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
        return `${a.getDate()} - ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
    }
    if (a.getFullYear() === b.getFullYear()) {
        return `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} - ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
    }
    return `${shortDate(start)} - ${shortDate(end)}`;
}

function formatNumber(value: number | null | undefined, digits = 1): string {
    if (value === null || value === undefined || Number.isNaN(value)) return "-";
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value);
}

function formatInt(value: number | null | undefined): string {
    return formatNumber(value, 0);
}

function cleanText(value?: string | null): string {
    if (!value) return "-";
    return value
        .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "")
        .replace(/\s+/g, " ")
        .trim() || "-";
}

function sum(logs: ReportDailyLog[], key: "pakan" | "minum"): number {
    return logs.reduce((acc, item) => acc + (item[key] ?? 0), 0);
}

function lastFilled(logs: ReportDailyLog[], key: "populasi" | "bobot"): number | null {
    for (let i = logs.length - 1; i >= 0; i -= 1) {
        const value = logs[i][key];
        if (value !== null && value !== undefined) return value;
    }
    return null;
}

function setFill(doc: jsPDF, color: RGB) {
    doc.setFillColor(color[0], color[1], color[2]);
}

function setStroke(doc: jsPDF, color: RGB) {
    doc.setDrawColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: RGB) {
    doc.setTextColor(color[0], color[1], color[2]);
}

function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number, radius = 2.5) {
    setFill(doc, WHITE);
    setStroke(doc, LINE);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, w, h, radius, radius, "FD");
}

function drawCover(doc: jsPDF, meta: ReportMeta) {
    const x = MARGIN;
    const y = 12;
    const w = CONTENT_W;
    const h = 46;

    setFill(doc, BRAND_DARK);
    doc.roundedRect(x, y, w, h, 4, 4, "F");

    setFill(doc, [10, 91, 69]);
    doc.circle(176, 37, 17, "F");
    setFill(doc, [13, 102, 80]);
    doc.circle(187, 25, 10, "F");

    setFill(doc, BRAND_BRIGHT);
    doc.roundedRect(22, 19, 11, 11, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setText(doc, WHITE);
    doc.text("B", 27.5, 26.9, { align: "center" });

    doc.setFontSize(8);
    doc.setCharSpace(0.9);
    doc.text("BROILABS", 37, 23.5);
    doc.setCharSpace(0.5);
    doc.setFontSize(5.5);
    setText(doc, [167, 243, 208]);
    doc.text("SMART FARM MONITORING", 37, 27.8);
    doc.setCharSpace(0);

    doc.setFontSize(19);
    doc.setFont("helvetica", "bold");
    setText(doc, WHITE);
    doc.text("Laporan Catatan Harian", 22, 45);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    setText(doc, [167, 243, 208]);
    const identity = [meta.kandangName, meta.kandangCode, meta.kandangType].filter(Boolean).join("  |  ");
    doc.text(identity, 22, 52.5);

    const right = x + w - 6;
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setCharSpace(0.5);
    setText(doc, [110, 231, 183]);
    doc.text("PERIODE LAPORAN", right, 23.5, { align: "right" });
    doc.setCharSpace(0);

    doc.setFontSize(9);
    setText(doc, WHITE);
    doc.text(formatPeriod(meta.startDate, meta.endDate), right, 30.5, { align: "right" });

    const generated = meta.generatedAt ?? new Date();
    const stamp = `${generated.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}, ${generated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    setText(doc, [167, 243, 208]);
    doc.text(`Dibuat ${stamp}`, right, 37, { align: "right" });
}

function drawCompactHeader(doc: jsPDF, meta: ReportMeta) {
    setFill(doc, WHITE);
    doc.rect(0, 0, PAGE_W, 22, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setText(doc, MINT_TEXT);
    doc.text("BROILABS", MARGIN, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(doc, MUTED);
    doc.text(`Laporan Catatan Harian  |  ${meta.kandangName}`, MARGIN + 17, 11);
    doc.text(formatPeriod(meta.startDate, meta.endDate), PAGE_W - MARGIN, 11, { align: "right" });

    setStroke(doc, LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 15, PAGE_W - MARGIN, 15);
}

function drawSectionTitle(doc: jsPDF, x: number, y: number, title: string, caption?: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, INK);
    doc.text(title, x, y);

    if (caption) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        setText(doc, MUTED);
        doc.text(caption, x, y + 4.5);
    }

    setStroke(doc, LINE);
    doc.setLineWidth(0.3);
    doc.line(x, y + (caption ? 7.5 : 3), x + CONTENT_W, y + (caption ? 7.5 : 3));
}

interface ReportSummary {
    days: number;
    pakanTotal: number;
    minumTotal: number;
    deathTotal: number;
    populasiAkhir: number | null;
    bobotAkhir: number | null;
    avgPakan: number | null;
    fcr: number | null;
    mortality: number | null;
}

function summarize(logs: ReportDailyLog[], deaths: ReportDeath[]): ReportSummary {
    const pakanTotal = sum(logs, "pakan");
    const minumTotal = sum(logs, "minum");
    const deathTotal = deaths.reduce((acc, item) => acc + item.count, 0);
    const populasiAkhir = lastFilled(logs, "populasi");
    const bobotAkhir = lastFilled(logs, "bobot");
    const daysWithFeed = logs.filter((item) => (item.pakan ?? 0) > 0).length;
    const biomassKg = populasiAkhir && bobotAkhir ? (populasiAkhir * bobotAkhir) / 1000 : null;
    const fcr = biomassKg && biomassKg > 0 && pakanTotal > 0 ? pakanTotal / biomassKg : null;
    const mortality = populasiAkhir && populasiAkhir + deathTotal > 0
        ? (deathTotal / (populasiAkhir + deathTotal)) * 100
        : null;

    return {
        days: logs.length,
        pakanTotal,
        minumTotal,
        deathTotal,
        populasiAkhir,
        bobotAkhir,
        avgPakan: daysWithFeed > 0 ? pakanTotal / daysWithFeed : null,
        fcr,
        mortality,
    };
}

function drawStatCard(
    doc: jsPDF,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    unit: string,
    accent: RGB,
) {
    setFill(doc, CARD);
    setStroke(doc, LINE);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");

    setFill(doc, accent);
    doc.roundedRect(x, y, 1.7, h, 0.85, 0.85, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setCharSpace(0.4);
    setText(doc, MUTED);
    doc.text(label.toUpperCase(), x + 5, y + 7.5);
    doc.setCharSpace(0);

    doc.setFontSize(13);
    setText(doc, INK);
    doc.text(value, x + 5, y + 17.5);
    const valueWidth = doc.getTextWidth(value);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setText(doc, MUTED);
    doc.text(unit, x + 5 + valueWidth + 1.4, y + 17.4);
}

function drawHighlightStrip(doc: jsPDF, y: number, summary: ReportSummary) {
    setFill(doc, MINT);
    setStroke(doc, MINT_BORDER);
    doc.setLineWidth(0.25);
    doc.roundedRect(MARGIN, y, CONTENT_W, 16, 2.5, 2.5, "FD");

    const items = [
        { label: "POPULASI AKHIR", value: summary.populasiAkhir !== null ? `${formatInt(summary.populasiAkhir)} ekor` : "-" },
        { label: "BOBOT TERAKHIR", value: summary.bobotAkhir !== null ? `${formatNumber(summary.bobotAkhir)} g` : "-" },
        { label: "FCR ESTIMASI", value: summary.fcr !== null ? formatNumber(summary.fcr, 2) : "-" },
        { label: "RATA-RATA PAKAN", value: summary.avgPakan !== null ? `${formatNumber(summary.avgPakan)} kg/hari` : "-" },
    ];

    const colW = CONTENT_W / items.length;
    items.forEach((item, index) => {
        const x = MARGIN + 6 + index * colW;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setCharSpace(0.3);
        setText(doc, [4, 120, 87]);
        doc.text(item.label, x, y + 6);
        doc.setCharSpace(0);

        doc.setFontSize(8.5);
        setText(doc, MINT_TEXT);
        doc.text(item.value, x, y + 12);
    });
}

interface ChartSpec {
    title: string;
    caption: string;
    labels: string[];
    values: number[];
    color: RGB;
    variant: "bar" | "line";
    zeroBased: boolean;
    tint: RGB;
}

function niceScale(minValue: number, maxValue: number, targetTicks: number) {
    const span = Math.max(maxValue - minValue, 0.0001);
    const rough = span / targetTicks;
    const exponent = Math.floor(Math.log10(rough));
    const base = 10 ** exponent;
    const normalized = rough / base;
    const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
    const step = factor * base;
    const min = Math.floor(minValue / step) * step;
    const max = Math.ceil(maxValue / step) * step;
    return { min, max, step };
}

function drawChartCard(doc: jsPDF, x: number, y: number, w: number, h: number, spec: ChartSpec) {
    drawCard(doc, x, y, w, h);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setText(doc, INK);
    doc.text(spec.title, x + 5, y + 8.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setText(doc, MUTED);
    doc.text(spec.caption, x + 5, y + 13);

    const plotX = x + 15;
    const plotRight = x + w - 7;
    const plotTop = y + 18;
    const plotBottom = y + h - 10;
    const plotW = plotRight - plotX;
    const plotH = plotBottom - plotTop;

    setFill(doc, spec.tint);
    doc.roundedRect(plotX, plotTop, plotW, plotH, 1.5, 1.5, "F");

    const values = spec.values;
    if (values.length === 0) {
        doc.setFontSize(7);
        setText(doc, SOFT);
        doc.text("Belum ada data", plotX + plotW / 2, plotTop + plotH / 2, { align: "center" });
        return;
    }

    let max = Math.max(...values);
    let min = spec.zeroBased ? 0 : Math.min(...values);

    if (spec.zeroBased) {
        max = max > 0 ? max * 1.08 : 1;
    } else {
        const pad = (max - min) * 0.12 || Math.abs(max) * 0.05 || 1;
        min = Math.max(0, min - pad);
        max += pad;
    }

    const scale = niceScale(min, max, spec.zeroBased ? 5 : 4);
    min = spec.zeroBased ? 0 : scale.min;
    max = scale.max;
    const range = max - min || 1;
    const tickCount = Math.max(1, Math.round((max - min) / scale.step));

    setStroke(doc, [203, 213, 225]);
    doc.setLineWidth(0.15);
    for (let i = 0; i <= tickCount; i += 1) {
        const gy = plotBottom - (i / tickCount) * plotH;
        doc.line(plotX, gy, plotRight, gy);

        const value = min + i * scale.step;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        setText(doc, SOFT);
        doc.text(formatNumber(value, scale.step < 1 ? 1 : 0), plotX - 1.5, gy + 1.8, { align: "right" });
    }

    const n = values.length;
    const xFor = (index: number) => (n === 1 ? plotX + plotW / 2 : plotX + (index / (n - 1)) * plotW);

    if (spec.variant === "bar") {
        const slot = plotW / n;
        const barW = Math.max(1.1, Math.min(5, slot * 0.58));
        setFill(doc, spec.color);
        values.forEach((value, index) => {
            const barH = Math.max(0, ((value - min) / range) * plotH);
            const barX = plotX + index * slot + (slot - barW) / 2;
            if (barH > 0) doc.roundedRect(barX, plotBottom - barH, barW, barH, 0.7, 0.7, "F");
        });
    } else {
        doc.setLineWidth(1.4);
        setStroke(doc, spec.color);
        for (let i = 1; i < n; i += 1) {
            const y1 = plotBottom - ((values[i - 1] - min) / range) * plotH;
            const y2 = plotBottom - ((values[i] - min) / range) * plotH;
            doc.line(xFor(i - 1), y1, xFor(i), y2);
        }
        if (n <= 18) {
            setFill(doc, WHITE);
            setStroke(doc, spec.color);
            doc.setLineWidth(0.6);
            values.forEach((value, index) => {
                const py = plotBottom - ((value - min) / range) * plotH;
                doc.circle(xFor(index), py, 0.8, "FD");
            });
        }
    }

    const step = Math.max(1, Math.ceil(n / 6));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    setText(doc, SOFT);
    let lastLabelRight = Number.NEGATIVE_INFINITY;
    spec.labels.forEach((label, index) => {
        if (index % step !== 0 && index !== n - 1) return;
        const labelWidth = doc.getTextWidth(label);
        const lx = Math.min(Math.max(xFor(index), plotX + labelWidth / 2), plotRight - labelWidth / 2);
        if (lx - labelWidth / 2 < lastLabelRight + 1.5) return;
        doc.text(label, lx, plotBottom + 4.5, { align: "center" });
        lastLabelRight = lx + labelWidth / 2;
    });
}

function fcrStatus(fcr: number | null): { text: string; color: RGB } {
    if (fcr === null) return { text: "Belum tersedia", color: MUTED };
    if (fcr <= 1.6) return { text: "Efisien", color: BRAND };
    if (fcr <= 1.8) return { text: "Normal", color: AMBER };
    return { text: "Perlu evaluasi", color: RED };
}

function drawPerformancePanel(doc: jsPDF, y: number, summary: ReportSummary) {
    setFill(doc, MINT);
    setStroke(doc, MINT_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, 30, 3, 3, "FD");

    setFill(doc, BRAND);
    doc.roundedRect(MARGIN, y, 1.8, 30, 0.9, 0.9, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(doc, MINT_TEXT);
    doc.text("Evaluasi Performa", MARGIN + 6, y + 6.5);

    const status = fcrStatus(summary.fcr);
    const items = [
        { label: "FCR ESTIMASI", value: summary.fcr !== null ? formatNumber(summary.fcr, 2) : "-", note: status.text, noteColor: status.color },
        { label: "MORTALITAS", value: summary.mortality !== null ? `${formatNumber(summary.mortality, 1)}%` : "-", note: summary.deathTotal > 0 ? `${formatInt(summary.deathTotal)} ekor` : "Tidak ada", noteColor: summary.mortality !== null && summary.mortality > 5 ? RED : MUTED },
        { label: "POPULASI AKHIR", value: summary.populasiAkhir !== null ? `${formatInt(summary.populasiAkhir)}` : "-", note: "ekor", noteColor: MUTED },
        { label: "BOBOT AKHIR", value: summary.bobotAkhir !== null ? `${formatNumber(summary.bobotAkhir)}` : "-", note: "gram/ekor", noteColor: MUTED },
    ];

    const colW = CONTENT_W / items.length;
    items.forEach((item, index) => {
        const x = MARGIN + 6 + index * colW;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setCharSpace(0.3);
        setText(doc, [4, 120, 87]);
        doc.text(item.label, x, y + 12);
        doc.setCharSpace(0);

        doc.setFontSize(12);
        setText(doc, MINT_TEXT);
        doc.text(item.value, x, y + 20);
        const vw = doc.getTextWidth(item.value);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        setText(doc, item.noteColor);
        doc.text(item.note, x + vw + 1.6, y + 19.6);
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    setText(doc, [71, 85, 105]);
    doc.text(
        "FCR dihitung dari total pakan dibagi estimasi biomassa akhir (populasi x bobot terakhir). Nilai bersifat indikatif.",
        MARGIN + 6,
        y + 26.5,
    );
}

function getFinalY(doc: jsPDF): number {
    const target = doc as unknown as { lastAutoTable?: { finalY?: number } };
    return target.lastAutoTable?.finalY ?? BOTTOM_LIMIT;
}

function addFooters(doc: jsPDF) {
    const total = doc.getNumberOfPages();
    for (let page = 1; page <= total; page += 1) {
        doc.setPage(page);
        setStroke(doc, LINE);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, 284, PAGE_W - MARGIN, 284);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        setText(doc, MUTED);
        doc.text("Broilabs SmartFarm  |  Laporan Catatan Harian", MARGIN, 289);
        doc.text(`Halaman ${page} dari ${total}`, PAGE_W - MARGIN, 289, { align: "right" });
    }
}

function groupDeathsByDate(deaths: ReportDeath[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const item of deaths) {
        const day = new Date(item.timestamp).toLocaleDateString("sv-SE");
        map[day] = (map[day] ?? 0) + item.count;
    }
    return map;
}

export function buildDailyLogReport(
    logsInput: ReportDailyLog[],
    deathsInput: ReportDeath[],
    meta: ReportMeta,
    options: ReportOptions,
): ReportResult {
    const logs = [...logsInput].sort((a, b) => a.date.localeCompare(b.date));
    const deaths = [...deathsInput].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const summary = summarize(logs, deaths);
    const deathsByDate = groupDeathsByDate(deaths);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setProperties({
        title: `Laporan Catatan Harian - ${meta.kandangName}`,
        subject: `Rekap catatan harian ${formatPeriod(meta.startDate, meta.endDate)}`,
        author: "Broilabs SmartFarm",
        creator: "Broilabs SmartFarm",
    });

    drawCover(doc, meta);

    const cardY = 66;
    const gap = 4;
    const cardW = (CONTENT_W - gap * 3) / 4;
    drawStatCard(doc, MARGIN, cardY, cardW, 24, "Hari Tercatat", formatInt(summary.days), "hari", BRAND_BRIGHT);
    drawStatCard(doc, MARGIN + (cardW + gap), cardY, cardW, 24, "Total Pakan", formatNumber(summary.pakanTotal), "kg", BRAND);
    drawStatCard(doc, MARGIN + (cardW + gap) * 2, cardY, cardW, 24, "Total Minum", formatNumber(summary.minumTotal), "liter", BLUE);
    drawStatCard(doc, MARGIN + (cardW + gap) * 3, cardY, cardW, 24, "Kematian", formatInt(summary.deathTotal), "ekor", RED);

    drawHighlightStrip(doc, 94, summary);

    let tableStart = 124;

    if (options.includeCharts && logs.length > 0) {
        drawSectionTitle(doc, MARGIN, 118, "Tren Harian", "Pakan, minum, populasi, dan kematian selama periode laporan");

        const labels = logs.map((item) => chartDate(item.date));
        const pakanValues = logs.map((item) => item.pakan ?? 0);
        const minumValues = logs.map((item) => item.minum ?? 0);
        const populasiValues = logs.map((item) => item.populasi ?? 0);
        const deathValues = logs.map((item) => deathsByDate[item.date.slice(0, 10)] ?? 0);

        const chartW = (CONTENT_W - 5) / 2;
        const chartH = 56;

        drawChartCard(doc, MARGIN, 128, chartW, chartH, {
            title: "Konsumsi Pakan",
            caption: `Total ${formatNumber(summary.pakanTotal)} kg`,
            labels,
            values: pakanValues,
            color: BRAND,
            variant: "bar",
            zeroBased: true,
            tint: [240, 253, 248],
        });
        drawChartCard(doc, MARGIN + chartW + 5, 128, chartW, chartH, {
            title: "Konsumsi Minum",
            caption: `Total ${formatNumber(summary.minumTotal)} liter`,
            labels,
            values: minumValues,
            color: BLUE,
            variant: "line",
            zeroBased: true,
            tint: [239, 246, 255],
        });
        drawChartCard(doc, MARGIN, 189, chartW, chartH, {
            title: "Populasi",
            caption: summary.populasiAkhir !== null ? `${formatInt(summary.populasiAkhir)} ekor terakhir` : "Belum ada data populasi",
            labels,
            values: populasiValues,
            color: [13, 148, 136],
            variant: "line",
            zeroBased: false,
            tint: [240, 253, 250],
        });
        drawChartCard(doc, MARGIN + chartW + 5, 189, chartW, chartH, {
            title: "Kematian",
            caption: `Total ${formatInt(summary.deathTotal)} ekor`,
            labels,
            values: deathValues,
            color: RED,
            variant: "bar",
            zeroBased: true,
            tint: [254, 242, 242],
        });

        drawPerformancePanel(doc, 250, summary);

        doc.addPage();
        drawCompactHeader(doc, meta);
        tableStart = 32;
    }

    drawSectionTitle(
        doc,
        MARGIN,
        tableStart,
        "Catatan Harian",
        `${logs.length} entri  |  ${formatPeriod(meta.startDate, meta.endDate)}`,
    );

    const rows = logs.map((item) => [
        tableDate(item.date),
        item.pakan !== null && item.pakan !== undefined ? formatNumber(item.pakan) : "-",
        item.minum !== null && item.minum !== undefined ? formatNumber(item.minum) : "-",
        item.populasi !== null && item.populasi !== undefined ? formatInt(item.populasi) : "-",
        item.bobot !== null && item.bobot !== undefined ? formatNumber(item.bobot) : "-",
        formatInt(deathsByDate[item.date.slice(0, 10)] ?? 0),
        cleanText(item.notes),
    ]);

    autoTable(doc, {
        startY: tableStart + 10,
        margin: { left: MARGIN, right: MARGIN, bottom: 18, top: 26 },
        head: [["Tanggal", "Pakan (kg)", "Minum (L)", "Populasi", "Bobot (g)", "Mati", "Catatan"]],
        body: rows,
        theme: "plain",
        styles: {
            font: "helvetica",
            fontSize: 7.4,
            textColor: INK,
            lineColor: LINE,
            lineWidth: 0.1,
            cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
            valign: "middle",
        },
        headStyles: {
            fillColor: BRAND_DARK,
            textColor: WHITE,
            fontStyle: "bold",
            fontSize: 6.6,
            lineWidth: 0,
            cellPadding: { top: 2.6, right: 2, bottom: 2.6, left: 2 },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 33, fontStyle: "bold", textColor: [51, 65, 85] },
            1: { cellWidth: 18, halign: "right" },
            2: { cellWidth: 18, halign: "right" },
            3: { cellWidth: 18, halign: "right" },
            4: { cellWidth: 17, halign: "right" },
            5: { cellWidth: 13, halign: "right", textColor: RED, fontStyle: "bold" },
            6: { cellWidth: "auto", textColor: [100, 116, 139] },
        },
        didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 6) {
                data.cell.text = [cleanText(String(data.cell.raw))];
            }
        },
        willDrawPage: (data) => {
            if (data.pageNumber > 1) drawCompactHeader(doc, meta);
        },
    });

    let endY = getFinalY(doc) + 12;

    if (deaths.length > 0) {
        if (endY > BOTTOM_LIMIT - 34) {
            doc.addPage();
            drawCompactHeader(doc, meta);
            endY = 32;
        }

        drawSectionTitle(
            doc,
            MARGIN,
            endY,
            "Laporan Kematian",
            `${deaths.length} laporan  |  ${formatInt(summary.deathTotal)} ekor`,
        );

        autoTable(doc, {
            startY: endY + 10,
            margin: { left: MARGIN, right: MARGIN, bottom: 18, top: 26 },
            head: [["Waktu Laporan", "Jumlah", "Catatan"]],
            body: deaths.map((item) => [
                new Date(item.timestamp).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                `${formatInt(item.count)} ekor`,
                cleanText(item.notes),
            ]),
            theme: "plain",
            styles: {
                font: "helvetica",
                fontSize: 7.4,
                textColor: INK,
                lineColor: LINE,
                lineWidth: 0.1,
                cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
                valign: "middle",
            },
            headStyles: {
                fillColor: [127, 29, 29],
                textColor: WHITE,
                fontStyle: "bold",
                fontSize: 6.6,
                lineWidth: 0,
                cellPadding: { top: 2.6, right: 2, bottom: 2.6, left: 2 },
            },
            alternateRowStyles: { fillColor: [254, 242, 242] },
            columnStyles: {
                0: { cellWidth: 50, fontStyle: "bold", textColor: [51, 65, 85] },
                1: { cellWidth: 24, halign: "right", textColor: RED, fontStyle: "bold" },
                2: { cellWidth: "auto", textColor: [100, 116, 139] },
            },
            didParseCell: (data) => {
                if (data.section === "body" && data.column.index === 2) {
                    data.cell.text = [cleanText(String(data.cell.raw))];
                }
            },
            willDrawPage: (data) => {
                if (data.pageNumber > 1) drawCompactHeader(doc, meta);
            },
        });

        endY = getFinalY(doc) + 10;
    }

    if (endY > BOTTOM_LIMIT - 8) {
        doc.addPage();
        drawCompactHeader(doc, meta);
        endY = 32;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    setText(doc, MUTED);
    doc.text(
        "Laporan ini dihasilkan otomatis oleh Broilabs SmartFarm dari data catatan harian kandang. Angka FCR dan mortalitas bersifat estimasi.",
        MARGIN,
        endY,
    );

    addFooters(doc);

    const blob = doc.output("blob");
    return {
        blob,
        pageCount: doc.getNumberOfPages(),
        size: blob.size,
        logCount: logs.length,
        deathCount: deaths.length,
    };
}

