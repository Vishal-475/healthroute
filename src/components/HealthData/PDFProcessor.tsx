import React, { useEffect, useState } from 'react';
import { Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { addDeficiencyData, DeficiencyRecord } from '../../services/DatabaseService';

interface PDFProcessorProps {
  file: File;
  onProcessed: (data: any) => void;
}

interface NutrientData {
  name: string;
  value: string;
  unit: string;
  referenceRange?: string;
  status?: 'normal' | 'deficient' | 'excess';
}

// Mock function to extract nutrient data from text
const extractNutrientData = (text: string): NutrientData[] => {
  // In a real application, this would use NLP or pattern matching to extract nutrient data
  // For this example, we'll return mock data
  return [
    {
      name: 'Vitamin D',
      value: '25',
      unit: 'ng/mL',
      referenceRange: '30-100 ng/mL',
      status: 'deficient'
    },
    {
      name: 'Iron',
      value: '95',
      unit: 'μg/dL',
      referenceRange: '60-170 μg/dL',
      status: 'normal'
    },
    {
      name: 'Vitamin B12',
      value: '950',
      unit: 'pg/mL',
      referenceRange: '200-900 pg/mL',
      status: 'excess'
    }
  ];
};

// Save nutrient data to the database
const saveNutrientDataToDatabase = async (nutrients: NutrientData[], userId: string) => {
  try {
    const date = new Date();
    
    // Save each nutrient as a separate deficiency record
    for (const nutrient of nutrients) {
      const deficiencyRecord: DeficiencyRecord = {
        date,
        nutrient: nutrient.name,
        value: parseFloat(nutrient.value),
        unit: nutrient.unit,
        referenceRange: nutrient.referenceRange,
        status: nutrient.status || 'normal',
        userId
      };
      
      await addDeficiencyData(deficiencyRecord);
    }
    
    console.log('Nutrient data saved to database');
    return true;
  } catch (error) {
    console.error('Error saving nutrient data to database:', error);
    return false;
  }
}

const PDFProcessor: React.FC<PDFProcessorProps> = ({ file, onProcessed }) => {
  const [processing, setProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const processPDF = async () => {
      try {
        setProcessing(true);
        setError(null);
        setProgress(10);
        
        // Configure the worker
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.mjs',
          import.meta.url
        ).toString();
        
        setProgress(30);
        
        // Read the file
        const fileData = await readFileAsArrayBuffer(file);
        setProgress(50);
        
        // Load the PDF document
        const pdf = await pdfjs.getDocument(fileData).promise;
        setProgress(60);
        
        // Extract text from all pages
        const numPages = pdf.numPages;
        let extractedText = '';
        const userId = 'user123'; // In a real app, this would come from authentication
        
        for (let i = 1; i <= numPages; i++) {
          if (!isMounted) return;
          
          // Update progress as we process each page
          setProgress(60 + Math.floor((i / numPages) * 30));
          
          // Get the page
          const page = await pdf.getPage(i);
          
          // Extract text content
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
            
          extractedText += pageText + '\n\n';
        }
        
        setProgress(90);
        
        // Extract structured nutrition data
        const structuredData = extractNutritionData(extractedText);
        
        // Extract nutrient data from the text
        const nutrients = extractNutrientData(extractedText);
        
        // Save nutrient data to the database
        await saveNutrientDataToDatabase(nutrients, userId);
        
        setProgress(100);
        
        // Send the processed data back
        if (isMounted) {
          onProcessed({
            text: extractedText,
            structured: structuredData,
            nutrients: nutrients,
            fileInfo: {
              name: file.name,
              size: `${(file.size / 1024).toFixed(2)} KB`,
              type: file.type,
              pages: numPages,
              lastModified: new Date(file.lastModified).toLocaleString()
            }
          });
          
          setProcessing(false);
        }
      } catch (err: any) {
        console.error('Error processing PDF:', err);
        if (isMounted) {
          setError(`Error processing PDF: ${err.message || 'Unknown error'}`);
          setProcessing(false);
        }
      }
    };
    
    processPDF();
    
    return () => {
      isMounted = false;
    };
  }, [file, onProcessed]);
  
  // Helper function to read file as ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };
  
  // Reference ranges for common nutrients
  const referenceRanges: Record<string, { min: number; max: number; unit: string }> = {
    'vitamin d': { min: 30, max: 100, unit: 'ng/mL' },
    'vitamin b12': { min: 200, max: 900, unit: 'pg/mL' },
    'iron': { min: 60, max: 170, unit: 'μg/dL' },
    'ferritin': { min: 15, max: 200, unit: 'ng/mL' },
    'calcium': { min: 8.5, max: 10.5, unit: 'mg/dL' },
    'magnesium': { min: 1.7, max: 2.2, unit: 'mg/dL' },
    'zinc': { min: 60, max: 120, unit: 'μg/dL' },
    'folate': { min: 2.7, max: 17.0, unit: 'ng/mL' },
    'vitamin a': { min: 20, max: 60, unit: 'μg/dL' },
    'vitamin e': { min: 5.5, max: 17, unit: 'mg/L' },
    'vitamin k': { min: 0.2, max: 3.2, unit: 'ng/mL' },
    'vitamin c': { min: 0.6, max: 2.0, unit: 'mg/dL' },
    'hemoglobin': { min: 12, max: 16, unit: 'g/dL' },
    'protein': { min: 6.0, max: 8.3, unit: 'g/dL' },
  };
  
  // Function to extract nutrition-related data from text
  const extractNutritionData = (text: string) => {
    const data: {
      nutrients: NutrientData[];
      deficiencies: NutrientData[];
      excesses: NutrientData[];
      labInfo?: {
        patientName?: string;
        patientId?: string;
        reportDate?: string;
        labName?: string;
      }
    } = {
      nutrients: [],
      deficiencies: [],
      excesses: []
    };
    
    // Extract patient information
    const patientNameMatch = text.match(/Patient(?:\s*name)?(?:\s*:)?\s*([A-Za-z\s]+?)(?:\n|,|;|$)/i);
    const patientIdMatch = text.match(/(?:Patient\s+ID|ID|MRN)(?:\s*:)?\s*([A-Za-z0-9-]+)(?:\n|,|;|$)/i);
    const reportDateMatch = text.match(/(?:Report\s+Date|Date\s+of\s+Report|Collection\s+Date)(?:\s*:)?\s*([A-Za-z0-9\s,/-]+)(?:\n|,|;|$)/i);
    const labNameMatch = text.match(/(?:Laboratory|Lab\s+Name|Facility)(?:\s*:)?\s*([A-Za-z0-9\s,/.&-]+)(?:\n|,|;|$)/i);
    
    data.labInfo = {
      patientName: patientNameMatch?.[1]?.trim(),
      patientId: patientIdMatch?.[1]?.trim(),
      reportDate: reportDateMatch?.[1]?.trim(),
      labName: labNameMatch?.[1]?.trim()
    };
    
    // Common patterns for lab values in medical reports
    // First, look for structured tables with Test, Result, Reference Range format
    const tableRowPattern = /([A-Za-z0-9\s,()%-]+?)\s+([\d.]+)\s*(ng\/mL|mcg\/dL|mg\/dL|g\/dL|IU\/L|μg\/dL|pg\/mL|mIU\/mL|μmol\/L|pmol\/L|nmol\/L)\s+(?:Reference\s+Range\s*:?\s*)?([0-9.-]+\s*(?:to|-|–)\s*[0-9.-]+\s*(?:ng\/mL|mcg\/dL|mg\/dL|g\/dL|IU\/L|μg\/dL|pg\/mL|mIU\/mL|μmol\/L|pmol\/L|nmol\/L))?/gi;
    
    let match;
    while ((match = tableRowPattern.exec(text)) !== null) {
      const name = match[1].trim().toLowerCase();
      const value = match[2].trim();
      const unit = match[3].trim();
      const referenceRange = match[4]?.trim();
      
      // Skip if it's not a nutrient we're interested in
      if (!isNutrientOfInterest(name)) continue;
      
      // Determine status based on reference range if available
      const status = determineStatus(name, parseFloat(value), referenceRange);
      
      const nutrientData: NutrientData = {
        name: name,
        value: value,
        unit: unit,
        referenceRange: referenceRange,
        status: status
      };
      
      data.nutrients.push(nutrientData);
      
      // Add to deficiencies or excesses list if applicable
      if (status === 'deficient') {
        data.deficiencies.push(nutrientData);
      } else if (status === 'excess') {
        data.excesses.push(nutrientData);
      }
    }
    
    // Look for key vitamin and mineral levels that might not be in a structured format
    const nutrientsList = [
      'vitamin d', 'vitamin b12', 'iron', 'ferritin', 'calcium', 'magnesium',
      'zinc', 'folate', 'vitamin a', 'vitamin e', 'vitamin k', 'vitamin c',
      'hemoglobin', 'protein'
    ];
    
    nutrientsList.forEach(nutrient => {
      // Only look for nutrients not already found in the structured search
      if (data.nutrients.some(n => n.name.includes(nutrient))) return;
      
      const regex = new RegExp(`${nutrient}[\\s:]*([\\d.]+)\\s*(ng\\/mL|mcg\\/dL|mg\\/dL|g\\/dL|IU\\/L|μg\\/dL|pg\\/mL|mIU\\/mL|μmol\\/L|pmol\\/L|nmol\\/L)`, 'i');
      const match = text.match(regex);
      
      if (match) {
        const value = match[1].trim();
        const unit = match[2].trim();
        const status = determineStatus(nutrient, parseFloat(value));
        
        const nutrientData: NutrientData = {
          name: nutrient,
          value: value,
          unit: unit,
          status: status
        };
        
        data.nutrients.push(nutrientData);
        
        // Add to deficiencies or excesses list if applicable
        if (status === 'deficient') {
          data.deficiencies.push(nutrientData);
        } else if (status === 'excess') {
          data.excesses.push(nutrientData);
        }
      }
    });
    
    return data;
  };
  
  // Helper to check if a nutrient name is one we're interested in
  const isNutrientOfInterest = (name: string): boolean => {
    const keywords = [
      'vitamin', 'iron', 'ferritin', 'calcium', 'magnesium', 'zinc', 'folate',
      'b12', 'b-12', 'd3', 'd-3', 'hemoglobin', 'protein', 'albumin',
      'selenium', 'copper', 'iodine', 'potassium', 'sodium', 'phosphorus',
      'manganese', 'chromium'
    ];
    
    return keywords.some(keyword => name.includes(keyword));
  };
  
  // Determine if a nutrient value is normal, deficient, or in excess
  const determineStatus = (
    nutrientName: string, 
    value: number, 
    rangeText?: string
  ): 'normal' | 'deficient' | 'excess' => {
    // If we have a reference range from the report, use that
    if (rangeText) {
      const rangeMatch = rangeText.match(/([0-9.]+)\s*(?:to|-|–)\s*([0-9.]+)/);
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        
        if (value < min) return 'deficient';
        if (value > max) return 'excess';
        return 'normal';
      }
    }
    
    // Otherwise use our predefined reference ranges
    const normalizedName = nutrientName.toLowerCase().trim();
    
    // Handle special cases with alternative names
    let lookupName = normalizedName;
    if (normalizedName.includes('25-oh') || normalizedName.includes('25 oh') || normalizedName.includes('25-hydroxy')) {
      lookupName = 'vitamin d';
    } else if (normalizedName.includes('b12') || normalizedName.includes('b-12') || normalizedName.includes('cobalamin')) {
      lookupName = 'vitamin b12';
    }
    
    // Check if we have reference data for this nutrient
    const knownRange = Object.keys(referenceRanges).find(key => lookupName.includes(key));
    
    if (knownRange && referenceRanges[knownRange]) {
      const { min, max } = referenceRanges[knownRange];
      
      if (value < min) return 'deficient';
      if (value > max) return 'excess';
      return 'normal';
    }
    
    // Default to normal if we don't have reference data
    return 'normal';
  };

  return (
    <div>
      {processing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing medical report{progress < 100 ? '...' : ''}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-emerald-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500">
            {progress < 30 ? "Initializing PDF processor..." : 
             progress < 60 ? "Reading document..." : 
             progress < 90 ? "Extracting nutrition data..." : 
             "Analyzing nutrient levels..."}
          </div>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      
      {!processing && !error && (
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle className="w-4 h-4" />
          <span>Medical report analyzed successfully</span>
        </div>
      )}
    </div>
  );
};

export default PDFProcessor;