'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number
  className?: string
}

export function FileUpload({ 
  onFileSelect, 
  maxFileSize = 5 * 1024 * 1024, // 5MB
  className 
}: FileUploadProps) {
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: {file: File; errors: {code: string; message: string}[]}[]) => {
    setUploadError(null)
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setUploadError(`File is too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB`)
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setUploadError(`Invalid file type. Please upload an Excel file (.xlsx or .xls)`)
      } else {
        setUploadError('File upload failed. Please try again.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setSelectedFile(file)
      onFileSelect(file)
    }
  }, [onFileSelect, maxFileSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxSize: maxFileSize,
    maxFiles: 1
  })

  const removeFile = () => {
    setSelectedFile(null)
    setUploadError(null)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400',
          uploadError ? 'border-red-300 bg-red-50' : '',
          selectedFile ? 'border-green-300 bg-green-50' : ''
        )}
      >
        <input {...getInputProps()} />
        
        {selectedFile ? (
          <div className="flex items-center justify-center space-x-2">
            <File className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-green-800">{selectedFile.name}</p>
              <p className="text-xs text-green-600">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeFile()
              }}
              className="ml-auto p-1 hover:bg-red-100 rounded"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload className={cn(
              'mx-auto h-12 w-12 mb-4',
              isDragActive ? 'text-primary' : 'text-gray-400'
            )} />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop the file here' : 'Upload Excel File'}
              </p>
              <p className="text-sm text-gray-500">
                Drag and drop your Excel file here, or click to browse
              </p>
              <p className="text-xs text-gray-400">
                Supports .xlsx and .xls files up to {Math.round(maxFileSize / 1024 / 1024)}MB
              </p>
            </div>
          </>
        )}
      </div>
      
      {uploadError && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{uploadError}</p>
        </div>
      )}
    </div>
  )
}