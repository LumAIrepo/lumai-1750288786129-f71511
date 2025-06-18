import React from "react"
```typescript
import { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm, File } from 'formidable'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export const config = {
  api: {
    bodyParser: false,
  },
}

interface TokenMetadata {
  name: string
  symbol: string
  description: string
  image: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  properties?: {
    files: Array<{
      uri: string
      type: string
    }>
    category: string
  }
}

interface UploadResponse {
  success: boolean
  metadataUri?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    const form = new IncomingForm({
      uploadDir: path.join(process.cwd(), 'public', 'uploads'),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    })

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const [fields, files] = await form.parse(req)

    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name
    const symbol = Array.isArray(fields.symbol) ? fields.symbol[0] : fields.symbol
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description

    if (!name || !symbol || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, symbol, description'
      })
    }

    let imageUri = ''

    // Handle image upload
    if (files.image) {
      const imageFile = Array.isArray(files.image) ? files.image[0] : files.image
      
      if (imageFile && imageFile.filepath) {
        const fileExtension = path.extname(imageFile.originalFilename || '')
        const fileName = `${uuidv4()}${fileExtension}`
        const newPath = path.join(uploadDir, fileName)

        // Move file to permanent location
        fs.renameSync(imageFile.filepath, newPath)
        
        // Create public URL
        imageUri = `/uploads/${fileName}`
      }
    }

    // Create metadata object
    const metadata: TokenMetadata = {
      name,
      symbol,
      description,
      image: imageUri,
      properties: {
        files: imageUri ? [{
          uri: imageUri,
          type: 'image/png'
        }] : [],
        category: 'image'
      }
    }

    // Save metadata to file
    const metadataId = uuidv4()
    const metadataPath = path.join(uploadDir, `${metadataId}.json`)
    
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))

    const metadataUri = `/uploads/${metadataId}.json`

    return res.status(200).json({
      success: true,
      metadataUri
    })

  } catch (error) {
    console.error('Upload metadata error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}
```