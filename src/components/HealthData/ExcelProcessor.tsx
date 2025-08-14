import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { read, utils } from 'xlsx';
import { ApiService } from '../../services/ApiService';

interface Column {
  name: string;
  type: string;
  confidence: number;
  mapped: boolean;
}

interface ProcessedData {
  columns: Column[];
  preview: any[];
}

interface NutrientRow { measured_at?: string | Date; nutrient: string; value: number; unit: string; file_name?: string }

// Normalize nutrient names to match reference table where needed
const normalizeName = (name: string): string => {
  const n = name.trim()
    .replace(/\u2011|\u2013|\u2014/g, '-') // normalize dashes
    .replace(/\s+/g, ' ');
  // unify common variants
  if (/^vitamin d.*25\s*-?\s*oh/i.test(n)) return 'Vitamin D – 25-OH';
  if (/^vitamin d.*1,?25\s*-?\s*oh/i.test(n)) return 'Vitamin D – 1,25-OH';
  if (/^iron(\s*\(serum\))?/i.test(n)) return 'Iron (Serum)';
  if (/^calcium$/i.test(n)) return 'Calcium';
  if (/^magnesium$/i.test(n)) return 'Magnesium';
  if (/^sodium$/i.test(n)) return 'Sodium';
  if (/^phosphorus$/i.test(n)) return 'Phosphorus';
  if (/^zinc$/i.test(n)) return 'Zinc';
  if (/^vitamin a$/i.test(n)) return 'Vitamin A';
  if (/^vitamin b12$/i.test(n)) return 'Vitamin B12';
  if (/^vitamin c$/i.test(n)) return 'Vitamin C';
  if (/^vitamin e$/i.test(n)) return 'Vitamin E';
  if (/^vitamin k$/i.test(n)) return 'Vitamin K';
  return name.trim();
};

const defaultUnits: Record<string, string> = {
  'Calcium': 'mg/dL',
  'Magnesium': 'mEq/L',
  'Sodium': 'mmol/L',
  'Phosphorus': 'mg/dL',
  'Zinc': 'µg/dL',
  'Iron (Serum)': 'µg/dL',
  'Vitamin A': 'µg/dL',
  'Vitamin B12': 'pg/mL',
  'Vitamin C': 'mg/dL',
  'Vitamin D – 1,25-OH': 'pg/mL',
  'Vitamin D – 25-OH': 'ng/mL',
  'Vitamin E': 'µg/mL',
  'Vitamin K': 'ng/mL',
};

const normalizeUnit = (unit: string | null | undefined, nutrient: string): string => {
  if (!unit || !String(unit).trim()) return defaultUnits[nutrient] || '';
  let u = String(unit).trim();
  // standardize micro symbols
  u = u.replace(/ug\/mL/i, 'µg/mL').replace(/ug\/dL/i, 'µg/dL').replace(/μg\/mL/i, 'µg/mL').replace(/μg\/dL/i, 'µg/dL');
  // standardize ng/ml capitalization
  if (/^ng\/?ml$/i.test(u)) u = 'ng/mL';
  if (/^pg\/?ml$/i.test(u)) u = 'pg/mL';
  if (/^mg\/?dl$/i.test(u)) u = 'mg/dL';
  if (/^mmol\/?l$/i.test(u)) u = 'mmol/L';
  if (/^meq\/?l$/i.test(u)) u = 'mEq/L';
  return u;
};

// Extract nutrient rows from a sheet JSON (supports two formats: tall columns or wide headers)
const extractRows = (jsonData: any[], fileName: string): NutrientRow[] => {
  const rows: NutrientRow[] = [];
  if (!jsonData || jsonData.length === 0) return rows;

  const headers = Object.keys(jsonData[0] || {}).map(h => String(h).trim());
  const lower = (s: string) => s.toLowerCase();

  // Tall format detection (Substance/Analyte/Test, Value/Result, Unit/Units, Date/Measured_At)
  const nameKey = headers.find(h => ['substance','analyte','test','nutrient','component','parameter'].includes(lower(h)));
  const valueKey = headers.find(h => ['value','result','reading','level','concentration'].includes(lower(h)));
  const unitKey  = headers.find(h => ['unit','units'].includes(lower(h)));
  const dateKey  = headers.find(h => ['date','measured_at','measured at','collected_at'].includes(lower(h)));

  if (nameKey && valueKey && unitKey) {
    for (const r of jsonData) {
      const rawName = r[nameKey];
      const rawVal  = r[valueKey];
      const rawUnit = r[unitKey];
      if (rawName == null || rawVal == null || rawUnit == null) continue;
      const value = Number(String(rawVal).replace(/[^0-9.\-]/g, ''));
      if (Number.isNaN(value)) continue;
      const normalized = normalizeName(String(rawName));
      rows.push({
        measured_at: dateKey ? r[dateKey] : new Date().toISOString(),
        nutrient: normalized,
        value,
        unit: normalizeUnit(String(rawUnit), normalized),
        file_name: fileName
      });
    }
    return rows;
  }

  // Tall-like without explicit value header: find first numeric cell as value, use Units column if present
  if (nameKey) {
    for (const r of jsonData) {
      const rawName = r[nameKey];
      if (rawName == null) continue;
      const normalized = normalizeName(String(rawName));
      const rawUnit = unitKey ? r[unitKey] : null;
      let foundValue: number | null = null;
      for (const k of Object.keys(r)) {
        const lk = lower(k);
        if ([nameKey, unitKey, dateKey].includes(k)) continue;
        if (['min','minimum','low','lower','max','maximum','high','upper'].includes(lk)) continue;
        const num = Number(String(r[k]).replace(/[^0-9.\-]/g, ''));
        if (!Number.isNaN(num)) { foundValue = num; break; }
      }
      if (foundValue != null) {
        rows.push({
          measured_at: dateKey ? r[dateKey] : new Date().toISOString(),
          nutrient: normalized,
          value: foundValue,
          unit: normalizeUnit(rawUnit, normalized),
          file_name: fileName
        });
      }
    }
    if (rows.length) return rows;
  }

  // Wide format: iterate all rows and collect numeric headers as nutrients
  for (const row of jsonData) {
    for (const key of Object.keys(row)) {
      const val = row[key];
      const num = Number(String(val).replace(/[^0-9.\-]/g, ''));
      if (Number.isNaN(num)) continue;
      const normalized = normalizeName(key);
      rows.push({ measured_at: new Date().toISOString(), nutrient: normalized, value: num, unit: normalizeUnit('', normalized), file_name: fileName });
    }
  }
  return rows;
};

// Save nutrient data to backend for classification and storage
const saveNutrientDataToBackend = async (rows: NutrientRow[], userId: string) => {
  try {
    if (!rows.length) return true;
    const payload = rows.map(r => ({
      measured_at: r.measured_at || new Date().toISOString(),
      nutrient: r.nutrient,
      value: r.value,
      unit: r.unit,
      file_name: r.file_name
    }));
    await ApiService.bulkImportNutrients(userId, payload as any);
    return true;
  } catch (e) {
    console.error('Error sending nutrient data to backend:', e);
    return false;
  }
};

export default function ExcelProcessor({ file, onProcessed }: { file: File; onProcessed: (data: any) => void }) {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processExcel = async () => {
    setProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
         const sheetName = workbook.SheetNames[0];
         const worksheet = workbook.Sheets[sheetName];
         const jsonData = utils.sheet_to_json(worksheet, { defval: null });

        // Analyze columns
        const headers = Object.keys(jsonData[0] || {});
        const columns: Column[] = headers.map(header => ({
          name: header,
          type: detectColumnType(jsonData, header),
          confidence: calculateConfidence(jsonData, header),
          mapped: false
        }));
        
         // Extract nutrient rows from the sheet
         const userId = 'user-1'; // align with other components' user id when backend auth is added
         const rows = extractRows(jsonData, file.name);

         // Send to backend for classification & storage
         await saveNutrientDataToBackend(rows, userId);

        setProcessedData({
          columns,
           preview: jsonData.slice(0, 5)
        });
        onProcessed({
          jsonData,
           rows
        });
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Error processing Excel file. Please check the format and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const detectColumnType = (data: any[], header: string): string => {
    const sample = data[0][header];
    if (typeof sample === 'number') return 'numeric';
    if (typeof sample === 'string') {
      if (sample.match(/^\d{4}-\d{2}-\d{2}$/)) return 'date';
      return 'text';
    }
    return 'unknown';
  };

  const calculateConfidence = (data: any[], header: string): number => {
    const nonNullCount = data.filter(row => row[header] != null).length;
    return (nonNullCount / data.length) * 100;
  };

  React.useEffect(() => {
    processExcel();
  }, [file]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
        <div>
          <h3 className="font-medium text-gray-900">{file.name}</h3>
          <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
        </div>
      </div>

      {processing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center p-8"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </motion.div>
      )}

      {error && (
        <div className="p-4 bg-red-50 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {processedData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedData.columns.map((column, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{column.name}</span>
                  <span className={`text-sm ${column.confidence > 80 ? 'text-emerald-600' : 'text-orange-500'}`}>
                    {column.confidence.toFixed(0)}% confidence
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="px-2 py-1 bg-gray-100 rounded">{column.type}</span>
                  {column.mapped && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      Mapped
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-4">Data Preview</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {processedData.columns.map((column, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processedData.preview.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {processedData.columns.map((column, colIndex) => (
                        <td
                          key={colIndex}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {row[column.name]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}