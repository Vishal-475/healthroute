import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileType, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { addHealthData, HealthDataRecord } from '../services/DatabaseService';
import { ApiService } from '../services/ApiService';
import { UserService } from '../services/UserService';
import ExcelProcessor from './HealthData/ExcelProcessor';
import PDFProcessor from './HealthData/PDFProcessor';

// Define types
interface FileData {
  name: string;
  type: string;
  file: File;
}

interface ExtractedDataType {
  [key: string]: any; // Can be defined more specifically based on your data structure
}

export default function HealthData() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedDataType>({});
  const [manualData, setManualData] = useState({
    bloodPressure: '',
    bloodSugar: '',
    weight: '',
    height: ''
  });
  const [diseases, setDiseases] = useState<string[]>([]);
  const [newDisease, setNewDisease] = useState('');
  const [allergens, setAllergens] = useState<string[]>([]);
  const [newAllergen, setNewAllergen] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const userId = 'user123'; // In a real app, this would come from authentication

  // Prefill height and weight from database profile
  useEffect(() => {
    (async () => {
      try {
        const profile = await UserService.getMyProfile();
        if (profile) {
          setManualData(prev => ({
            ...prev,
            weight: profile.weight_kg != null ? String(profile.weight_kg) : prev.weight,
            height: profile.height_cm != null ? String(profile.height_cm) : prev.height,
          }));
        }
      } catch {
        // ignore prefill failures
      }
    })();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      setFiles((prev: FileData[]) => [...prev, { name: file.name, type: file.type, file }]);
      setError(null);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  });

  const handleProcessedData = (data: any, fileName: string) => {
    console.log('Processed data:', data);
    
    setExtractedData((prev: ExtractedDataType) => ({
      ...prev,
      [fileName]: data
    }));
    // Handle the processed data
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    setFiles((prev: FileData[]) => prev.filter((_, i) => i !== index));
    
    // Also remove the processed data if it exists
    if (extractedData[fileToRemove.name]) {
      const newExtractedData = { ...extractedData };
      delete newExtractedData[fileToRemove.name];
      setExtractedData(newExtractedData);
    }
  };
  
  // Handle input change for manual data entry
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setManualData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear success message when user starts typing again
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };

  // Handle adding a new disease
  const handleAddDisease = () => {
    if (newDisease.trim() && !diseases.includes(newDisease.trim())) {
      setDiseases(prev => [...prev, newDisease.trim()]);
      setNewDisease('');
      if (saveSuccess) {
        setSaveSuccess(false);
      }
    }
  };

  // Handle removing a disease
  const handleRemoveDisease = (diseaseToRemove: string) => {
    setDiseases(prev => prev.filter(disease => disease !== diseaseToRemove));
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };

  // Handle disease input key press
  const handleDiseaseKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDisease();
    }
  };

  // Handle adding a new allergen
  const handleAddAllergen = () => {
    if (newAllergen.trim() && !allergens.includes(newAllergen.trim())) {
      setAllergens(prev => [...prev, newAllergen.trim()]);
      setNewAllergen('');
      if (saveSuccess) {
        setSaveSuccess(false);
      }
    }
  };

  // Handle removing an allergen
  const handleRemoveAllergen = (allergenToRemove: string) => {
    setAllergens(prev => prev.filter(allergen => allergen !== allergenToRemove));
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };

  // Handle allergen input key press
  const handleAllergenKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAllergen();
    }
  };
  
  // Handle manual data submission
  const handleManualDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Calculate BMI if both weight and height are provided
      let bmi: number | undefined = undefined;
      if (manualData.weight && manualData.height) {
        const weightKg = parseFloat(manualData.weight);
        const heightM = parseFloat(manualData.height) / 100; // Convert cm to m
        bmi = weightKg / (heightM * heightM);
      }
      
      // Create health data record
      const healthRecord: HealthDataRecord = {
        date: new Date(),
        bloodPressure: manualData.bloodPressure || undefined,
        bloodSugar: manualData.bloodSugar || undefined,
        weight: manualData.weight ? parseFloat(manualData.weight) : undefined,
        height: manualData.height ? parseFloat(manualData.height) : undefined,
        bmi,
        diseases: diseases.length > 0 ? diseases : undefined,
        allergens: allergens.length > 0 ? allergens : undefined,
        userId,
        source: 'manual'
      };
      
      // Save to backend first (blood pressure/sugar, conditions, allergens)
      try {
        const parsedWeight = manualData.weight ? parseFloat(manualData.weight) : undefined;
        const parsedHeight = manualData.height ? parseFloat(manualData.height) : undefined;
        await ApiService.saveHealthEntry({
          userId,
          blood_pressure: manualData.bloodPressure || null,
          blood_sugar: manualData.bloodSugar ? parseFloat(manualData.bloodSugar) : null,
          blood_sugar_unit: 'mg/dL',
          conditions: diseases,
          allergens: allergens,
        });
      } catch (e) {
        // fallback local store for compatibility
        await addHealthData(healthRecord);
      }
      
      // Reset form and show success message
      setManualData({
        bloodPressure: '',
        bloodSugar: '',
        weight: '',
        height: ''
      });
      setDiseases([]);
      setAllergens([]);
      setSaveSuccess(true);
      
      console.log('Manual health data saved successfully');
    } catch (error) {
      console.error('Error saving manual health data:', error);
      setError('Failed to save health data. Please try again.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Health Data Import</h2>
        
        <motion.div
          {...getRootProps()}
          whileHover={{ scale: 1.02 }}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-500'}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <p className="text-lg text-gray-600 mb-2">
            Drag & drop your health documents here
          </p>
          <p className="text-sm text-gray-500">
            Supports PDF, Excel (.xlsx), and image files
          </p>
        </motion.div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-8 space-y-6">
            {files.map((file, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                  <div className="flex items-center gap-3">
                    <FileType className="w-5 h-5 text-emerald-600" />
                    <span className="flex-1 font-medium text-gray-700">{file.name}</span>
                  </div>
                  <button 
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="p-3">
                  {file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && (
                    <ExcelProcessor 
                      file={file.file} 
                      onProcessed={(data) => handleProcessedData(data, file.name)} 
                    />
                  )}
                  {file.type === 'application/pdf' && (
                    <PDFProcessor 
                      file={file.file} 
                      onProcessed={(data) => handleProcessedData(data, file.name)} 
                    />
                  )}
                  {!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'].includes(file.type) && (
                    <div className="p-3 text-sm text-gray-500">
                      Processing not available for this file type
                    </div>
                  )}
                </div>
                
                {/* Display extracted data if available */}
                {extractedData[file.name] && (
                  <div className="p-3 border-t">
                    <h3 className="font-medium text-gray-800 mb-2">Extracted Data</h3>
                    {file.type === 'application/pdf' && extractedData[file.name].text && (
                      <div className="mt-2">
                        <details className="text-sm text-gray-700">
                          <summary className="cursor-pointer hover:text-emerald-600">View extracted text</summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded-md max-h-48 overflow-y-auto whitespace-pre-line">
                            {extractedData[file.name].text}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Manual Data Entry</h2>
        <form className="space-y-6" onSubmit={handleManualDataSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Pressure
              </label>
              <input
                type="text"
                name="bloodPressure"
                value={manualData.bloodPressure}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="120/80"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Sugar Level
              </label>
              <input
                type="text"
                name="bloodSugar"
                value={manualData.bloodSugar}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="mg/dL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight
              </label>
              <input
                type="number"
                name="weight"
                value={manualData.weight}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height
              </label>
              <input
                type="number"
                name="height"
                value={manualData.height}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="cm"
              />
            </div>
          </div>

          {/* Diseases Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Medical Conditions</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDisease}
                  onChange={(e) => setNewDisease(e.target.value)}
                  onKeyPress={handleDiseaseKeyPress}
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter a medical condition or disease"
                />
                <button
                  type="button"
                  onClick={handleAddDisease}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Add
                </button>
              </div>
              
              {diseases.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {diseases.map((disease, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm"
                    >
                      {disease}
                      <button
                        type="button"
                        onClick={() => handleRemoveDisease(disease)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Allergens Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Food Allergies</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value)}
                  onKeyPress={handleAllergenKeyPress}
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter a food allergy (e.g., peanuts, dairy, gluten)"
                />
                <button
                  type="button"
                  onClick={handleAddAllergen}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Add
                </button>
              </div>
              
              {allergens.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allergens.map((allergen, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm"
                    >
                      {allergen}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergen(allergen)}
                        className="text-orange-500 hover:text-orange-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p>Health data saved successfully!</p>
            </div>
          )}
          
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Save Health Data
          </button>
        </form>
      </div>
    </div>
  );
}