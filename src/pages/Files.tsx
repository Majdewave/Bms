import { useState, useEffect } from 'react'
import {
  FolderOpen,
  Upload,
  Download,
  Trash2,
  Search,
  Filter,
  Lock,
  File,
  FileText,
  Sheet,
  FileUp,
} from 'lucide-react'
import { filesService } from '@/api'
import type { StorageFile } from '@/api/filesService'

type CategoryFilter = 'all' | 'document' | 'contract' | 'report' | 'other'

export default function Files() {
  const [files, setFiles] = useState<StorageFile[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true)
      try {
        const data = await filesService.getFiles()
        setFiles(data)
      } catch (error) {
        console.error('Failed to load files:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFiles()
  }, [])

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(search.toLowerCase()) ||
      file.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const getFileIcon = (type: string) => {
    const lowerType = type.toLowerCase()
    if (lowerType.includes('pdf')) {
      return <FileText className="w-6 h-6 text-red-600" />
    } else if (lowerType.includes('excel') || lowerType.includes('sheet')) {
      return <Sheet className="w-6 h-6 text-green-600" />
    } else if (lowerType.includes('word') || lowerType.includes('document')) {
      return <FileText className="w-6 h-6 text-blue-600" />
    }
    return <File className="w-6 h-6 text-gray-600" />
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'contract':
        return { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100' }
      case 'report':
        return { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100' }
      case 'document':
        return { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100' }
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100' }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleDownload = (fileName: string) => {
    console.log(`Downloading ${fileName}`)
    // In a real app, this would download the file
  }

  const handleDelete = (fileId: string, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete ${fileName}?`)) {
      setFiles(files.filter((f) => f.id !== fileId))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">File Vault</h1>
          <p className="text-gray-600 mt-2">Securely store and manage your documents.</p>
        </div>
        <button
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm hover:shadow-md"
          aria-label="Upload new file"
        >
          <Upload className="w-5 h-5" />
          Upload File
        </button>
      </div>

      {/* Security Badge */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-green-900">Bank-level encryption</p>
          <p className="text-sm text-green-700 mt-0.5">
            All files are encrypted at rest and in transit for maximum security
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search files by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            aria-label="Search files"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Filter:</span>
          </div>
          {['all', 'document', 'contract', 'report', 'other'].map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category as CategoryFilter)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                selectedCategory === category
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-lg mb-1">
            {search ? 'No files found' : 'No files uploaded'}
          </p>
          <p className="text-gray-500">
            {search
              ? 'Try adjusting your search terms'
              : 'Upload your first document to get started'}
          </p>
        </div>
      ) : (
        /* Files Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFiles.map((file) => {
            const colors = getCategoryColor(file.category)
            return (
              <div
                key={file.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden group"
              >
                {/* File Header */}
                <div className={`p-6 ${colors.bg}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      {getFileIcon(file.type)}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${colors.badge} ${colors.text}`}
                    >
                      {file.category.charAt(0).toUpperCase() + file.category.slice(1)}
                    </span>
                  </div>

                  {/* File Name */}
                  <h3 className="font-bold text-gray-900 text-base line-clamp-2 mb-1">
                    {file.name}
                  </h3>

                  {/* File Type & Size */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-semibold">{file.type}</span>
                    <span>•</span>
                    <span>{file.size}</span>
                  </div>
                </div>

                {/* File Details */}
                <div className="p-6 space-y-4">
                  {/* Description */}
                  {file.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        Description
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-2">{file.description}</p>
                    </div>
                  )}

                  {/* Upload Date */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                      Uploaded
                    </p>
                    <p className="text-sm text-gray-700">{formatDate(file.date)}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-200 flex gap-2">
                    <button
                      onClick={() => handleDownload(file.name)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-600 font-semibold text-sm rounded-lg transition-colors"
                      aria-label={`Download ${file.name}`}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file.id, file.name)}
                      className="px-3 py-2.5 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 font-semibold rounded-lg transition-colors"
                      aria-label={`Delete ${file.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Storage Info */}
      {!loading && files.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-2">Total Files</p>
              <p className="text-2xl font-bold text-gray-900">{filteredFiles.length}</p>
              <p className="text-xs text-gray-500 mt-1">of {files.length} files</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-2">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900">
                {(
                  files.reduce((sum, f) => {
                    const sizeNum = parseFloat(f.size)
                    return sum + sizeNum
                  }, 0) / 1024
                ).toFixed(1)}{' '}
                GB
              </p>
              <p className="text-xs text-gray-500 mt-1">Storage used</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-2">Last Updated</p>
              <p className="text-2xl font-bold text-gray-900">
                {files.length > 0 ? formatDate(files[0].date) : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Most recent file</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
