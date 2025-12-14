import React, { useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';

// Simple EXIF GPS parser (no external dependencies needed)
function extractGPSFromExif(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  
  // Check for JPEG signature
  if (view.getUint16(0) !== 0xFFD8) {
    return null;
  }
  
  let offset = 2;
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset);
    
    // Look for APP1 (EXIF) marker (0xFFE1)
    if (marker === 0xFFE1) {
      const length = view.getUint16(offset + 2);
      const exifStart = offset + 4;
      
      // Check for "Exif\0\0" identifier
      if (view.getUint32(exifStart) === 0x45786966 && view.getUint16(exifStart + 4) === 0) {
        const tiffStart = exifStart + 6;
        const littleEndian = view.getUint16(tiffStart) === 0x4949;
        
        // Get IFD0 offset
        const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
        const numEntries = view.getUint16(ifd0Offset, littleEndian);
        
        // Look for GPS IFD pointer (tag 0x8825)
        for (let i = 0; i < numEntries; i++) {
          const entryOffset = ifd0Offset + 2 + (i * 12);
          const tag = view.getUint16(entryOffset, littleEndian);
          
          if (tag === 0x8825) {
            const gpsIfdOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
            return parseGPSIFD(view, gpsIfdOffset, tiffStart, littleEndian);
          }
        }
      }
      break;
    }
    
    offset += 2 + view.getUint16(offset + 2);
  }
  
  return null;
}

function parseGPSIFD(view, offset, tiffStart, littleEndian) {
  const numEntries = view.getUint16(offset, littleEndian);
  let lat = null, lon = null, latRef = null, lonRef = null;
  
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = offset + 2 + (i * 12);
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
    
    if (tag === 1) { // GPSLatitudeRef
      latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
    } else if (tag === 2) { // GPSLatitude
      const dataOffset = tiffStart + valueOffset;
      lat = parseGPSCoordinate(view, dataOffset, littleEndian);
    } else if (tag === 3) { // GPSLongitudeRef
      lonRef = String.fromCharCode(view.getUint8(entryOffset + 8));
    } else if (tag === 4) { // GPSLongitude
      const dataOffset = tiffStart + valueOffset;
      lon = parseGPSCoordinate(view, dataOffset, littleEndian);
    }
  }
  
  if (lat !== null && lon !== null && latRef && lonRef) {
    const latitude = latRef === 'S' ? -lat : lat;
    const longitude = lonRef === 'W' ? -lon : lon;
    return { latitude, longitude };
  }
  
  return null;
}

function parseGPSCoordinate(view, offset, littleEndian) {
  const degrees = view.getUint32(offset, littleEndian) / view.getUint32(offset + 4, littleEndian);
  const minutes = view.getUint32(offset + 8, littleEndian) / view.getUint32(offset + 12, littleEndian);
  const seconds = view.getUint32(offset + 16, littleEndian) / view.getUint32(offset + 20, littleEndian);
  return degrees + (minutes / 60) + (seconds / 3600);
}

// Reverse geocode using Nominatim
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TripCrafter' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch (e) {
    console.warn('Reverse geocode failed:', e);
    return null;
  }
}

export default function PhotoUploadModal({ isOpen, onClose, onPhotosUploaded }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    
    // Create previews
    const newPreviews = files.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      file
    }));
    setPreviews(newPreviews);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setProcessing(true);
    setStatus('Processing photos...');
    
    const results = [];
    
    for (const file of selectedFiles) {
      try {
        setStatus(`Processing ${file.name}...`);
        
        // Read file as array buffer to extract EXIF
        const arrayBuffer = await file.arrayBuffer();
        const gps = extractGPSFromExif(arrayBuffer);
        
        let location = null;
        if (gps) {
          setStatus(`Found GPS data for ${file.name}, looking up location...`);
          location = await reverseGeocode(gps.latitude, gps.longitude);
        }
        
        // Create object URL for the photo
        const photoUrl = URL.createObjectURL(file);
        
        results.push({
          file,
          photoUrl,
          gps,
          location: location || 'Unknown Location',
          title: file.name.replace(/\.[^/.]+$/, '') // Remove extension
        });
        
      } catch (e) {
        console.error('Error processing file:', file.name, e);
      }
    }
    
    setProcessing(false);
    setStatus(`Processed ${results.length} photos!`);
    
    // Pass results to parent
    if (onPhotosUploaded) {
      onPhotosUploaded(results);
    }
    
    // Clean up and close
    setTimeout(() => {
      handleClose();
    }, 1000);
  };

  const handleClose = () => {
    // Clean up object URLs
    previews.forEach(p => URL.revokeObjectURL(p.url));
    setSelectedFiles([]);
    setPreviews([]);
    setStatus('');
    onClose();
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index].url);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>
        
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-8 h-8 text-indigo-600" />
            <h2 className="text-2xl font-bold text-indigo-600">Upload Trip Photos</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Upload photos from your trip. We'll automatically extract GPS location data (if available) and create trip items for you!
          </p>

          {/* File input */}
          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">JPG, PNG (with EXIF GPS data)</p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={processing}
              />
            </label>
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Selected Photos ({previews.length})
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {previews.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="w-full h-24 object-cover rounded border border-gray-300"
                    />
                    {!processing && (
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <p className="text-xs text-gray-600 mt-1 truncate">{preview.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          {status && (
            <div className="mb-4 p-3 bg-indigo-50 text-indigo-700 rounded text-sm">
              {status}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={processing}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || processing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Extract
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
