"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Printer, Edit2, RotateCcw, ArrowRight } from "lucide-react"
import OrderPrintPage from "@/components/OrderPrintPage"
import ShippingLabelTemplate from "@/components/ShippingLabelTemplate"
import { publicApi } from "@/utils/axios"
import { jsPDF } from "jspdf"

// Add JsBarcode type declaration
declare global {
  interface Window {
    JsBarcode: any
  }
}

// Types definition
interface TemplateType {
  id: string
  name: string
  width: number
  height: number
  className?: string
  description?: string
  isDefault?: boolean
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  scaleFactor?: number
  printSettings?: {
    fitToPage: boolean
    respectBoundaries: boolean
  }
}

interface FromAddressType {
  name: string
  street: string
  city: string
  state: string
  zipCode: string
  phone: string
  tenent_id?: string
}

interface OrderType {
  id: string
  name: string
  toAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
    phone: string
  }
  isPrepaid: boolean
  orderDate: string
  shipVia: string
  products: Array<{ name: string; quantity: number }>
  totalItems: number
  packedBy: string
  weight: string
}

interface BillResponseType {
  bill_id: string
  customer_details: {
    name: string
    flat_no?: string
    street: string
    district: string
    state: string
    pincode: string
    phone: string
  }
  bill_details: {
    bill_no: string | number
    date: string
    time: string
  }
  shipping_details?: {
    method_name?: string
    weight?: string
  }
  product_details: Array<{
    productName: string
    quantity: number
  }>
  organisation_details: {
    Name: string
    street: string
    district: string
    state: string
    pincode: string
    phone: string
  }
}

interface PrintManagementProps {
  orderData?: OrderType
}

// UNIFIED LAYOUT DATA STRUCTURE - Single source of truth for both print and PDF
interface UnifiedLayoutData {
  // Template dimensions
  templateWidth: number
  templateHeight: number
  templateWidthPt: number
  templateHeightPt: number

  // Styling
  baseFontSize: number
  titleFontSize: number
  smallFontSize: number
  lineHeight: number
  letterSpacing: string

  // Spacing and positioning
  marginPx: number
  marginPt: number
  paddingPx: number
  paddingPt: number
  borderWidthPx: number
  borderWidthPt: number
  topPaddingAdjustment: number
  sectionSpacing: number

  // Box dimensions
  toAddressBoxHeight: number
  detailBoxHeight: number

  // Barcode settings
  barcodeWidth: number
  barcodeHeight: number

  // Content data
  formattedOrder: any
  fromAddress: any
  productText: string
}

const PrintManagement = ({ orderData }: PrintManagementProps) => {
  const [step, setStep] = useState(1)
  const [fromAddress, setFromAddress] = useState<FromAddressType>({
    name: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
  })
  const [hasCheckedForAddress, setHasCheckedForAddress] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null)
  const [templates, setTemplates] = useState<TemplateType[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showTemplateEdit, setShowTemplateEdit] = useState(false)
  const [bills, setBills] = useState(0)
  const [billId, setBillId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<OrderType | null>(null)
  const [tenentId, setTenentId] = useState<string | null>(null)
  const [isAddressSaved, setIsAddressSaved] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [printHistory, setPrintHistory] = useState<string[]>([])
  const [showPrintHistory, setShowPrintHistory] = useState(false)

  const defaultOrder: OrderType = {
    id: "120873",
    name: "Vaseegrah Veda Order",
    toAddress: {
      name: "Pramoth Murali",
      street: "11-A, Periyar street",
      city: "Mettupalayam",
      state: "Thiruvarur, TN",
      zipCode: "610001",
      phone: "09940904131 9940904131",
    },
    isPrepaid: true,
    orderDate: "4/7/2025, 12:36:27 AM",
    shipVia: "Free shipping (ST Co.)",
    products: [
      { name: "Almond oil - 35ml", quantity: 2 },
      { name: "Country Jaggery", quantity: 1 },
      { name: "Kids Tooth Powder - 50g", quantity: 2 },
      { name: "Kids Tooth Brush", quantity: 1 },
    ],
    totalItems: 6,
    packedBy: "Vaseegrah Team",
    weight: "0.5 kg",
  }

  const order = currentOrder || orderData || defaultOrder

  useEffect(() => {
    const tenentIdFromStorage = localStorage.getItem("tenentid")
    setTenentId(tenentIdFromStorage)

    const history = localStorage.getItem("printHistory")
    if (history) {
      try {
        setPrintHistory(JSON.parse(history))
      } catch (e) {
        console.error("Error parsing print history:", e)
        setPrintHistory([])
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && !window.JsBarcode) {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"
      script.async = true
      document.head.appendChild(script)
    }
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await publicApi.get("/api/printingroute/templates", {
        headers: {
          "tenent-id": tenentId || "",
        },
      })

      if (response.data && response.data.success && response.data.data) {
        setTemplates(response.data.data)
        const defaultTemplate = response.data.data.find((t: TemplateType) => t.isDefault)
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate)
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => {
    if (tenentId) {
      fetchTemplates()
    }
  }, [tenentId])

  const fetchFromAddress = async () => {
    try {
      setIsLoading(true)
      const response = await publicApi.get("/api/printingroute/from-address", {
        headers: {
          "tenent-id": tenentId || "",
        },
      })

      if (response.data && response.data.data) {
        const addressData = response.data.data
        setFromAddress({
          name: addressData.name,
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          zipCode: addressData.zipCode,
          phone: addressData.phone,
        })
        setIsAddressSaved(true)

        if (addressData.templateId) {
          const foundTemplate = templates.find((t) => t.id === addressData.templateId)
          if (foundTemplate) {
            setSelectedTemplate(foundTemplate)
          } else {
            fetchTemplates()
          }
        }

        return true
      }
      setIsAddressSaved(false)
      return false
    } catch (error) {
      console.error("Error fetching from address:", error)
      setIsAddressSaved(false)
      return false
    } finally {
      setIsLoading(false)
      setHasCheckedForAddress(true)
    }
  }

  useEffect(() => {
    if (tenentId && !hasCheckedForAddress) {
      fetchFromAddress()
    }
  }, [tenentId, hasCheckedForAddress])

  const previewFromAddress: FromAddressType = {
    name: fromAddress.name || "VASEEGRAH VEDA",
    street: fromAddress.street || "No:7 Vijaya Nagar",
    city: fromAddress.city || "Srinivasapuram (Post)",
    state: fromAddress.state || "Tamil Nadu",
    zipCode: fromAddress.zipCode || "613009",
    phone: fromAddress.phone || "8248817165",
  }

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await publicApi.get("/api/printingroute/pending-count", {
          headers: {
            "tenent-id": tenentId || "",
          },
        })
        if (response.data && response.data.count !== undefined) {
          setBills(response.data.count)
        }
      } catch (error) {
        console.error("Error fetching pending count:", error)
      }
    }

    if (tenentId) {
      fetchPendingCount()
    }
  }, [tenentId])

  const handleFromAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFromAddress((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmitFromAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!fromAddress.name || !fromAddress.street || !fromAddress.city) {
      alert("Please fill in the required fields")
      return
    }

    try {
      setIsLoading(true)
      const addressData = {
        ...fromAddress,
        tenent_id: tenentId,
        templateId: selectedTemplate?.id || "4x6",
      }

      const response = await publicApi.post("/api/printingroute/from-address", addressData, {
        headers: {
          "tenent-id": tenentId || "",
        },
      })

      if (response.data.success) {
        setIsAddressSaved(true)
        setIsEditingAddress(false)
      } else {
        alert("Error saving address: " + response.data.message)
      }
    } catch (error: any) {
      console.error("Error saving address:", error)
      alert("Failed to save address: " + (error.response?.data?.message || error.message))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => {
    if (!selectedTemplate) {
      alert("Please select a template")
      return
    }
    setStep(2)
  }

  const handleTemplateSelect = async (template: TemplateType) => {
    setSelectedTemplate(template)

    try {
      setIsLoading(true)

      await publicApi.post(
        "/api/printingroute/templates",
        {
          tenent_id: tenentId,
          templateId: template.id,
          name: template.name,
          description: template.description || "",
          width: template.width,
          height: template.height,
          className: template.className || "",
          isDefault: true,
        },
        {
          headers: {
            "tenent-id": tenentId || "",
          },
        },
      )

      if (isAddressSaved && !isEditingAddress) {
        updateAddressWithTemplate(template.id)
      }

      fetchTemplates()
    } catch (error) {
      console.error("Error saving template preference:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateAddressWithTemplate = async (templateId: string) => {
    try {
      setIsLoading(true)
      const addressData = {
        ...fromAddress,
        tenent_id: tenentId,
        templateId: templateId,
      }

      await publicApi.post("/api/printingroute/from-address", addressData, {
        headers: {
          "tenent-id": tenentId || "",
        },
      })
    } catch (error) {
      console.error("Error updating template preference:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // IMPROVED UNIFIED LAYOUT GENERATOR - Fixed spacing and alignment calculations
  const generateUnifiedLayoutData = (
    billData: any,
    template: TemplateType | null,
    fromAddr: FromAddressType,
  ): UnifiedLayoutData => {
    // Template dimensions
    const templateWidth = template?.width || 384
    const templateHeight = template?.height || 384
    const templateWidthPt = templateWidth * 0.75 // Convert px to pt (96 DPI)
    const templateHeightPt = templateHeight * 0.75

    // IMPROVED Template-specific styling with better proportions
    let styling
    if (template?.id === "2x4" || templateWidth <= 192) {
      styling = {
        baseFontSize: 7,
        titleFontSize: 8,
        smallFontSize: 6,
        lineHeight: 1.1,
        letterSpacing: "normal",
        marginPx: 6,
        marginPt: 4.5,
        paddingPx: 4,
        paddingPt: 3,
        borderWidthPx: 1,
        borderWidthPt: 0.75,
        topPaddingAdjustment: 6,
        sectionSpacing: 3,
        barcodeWidth: 1.2,
        barcodeHeight: 25,
      }
    } else if (template?.id === "4x4" || templateWidth <= 384) {
      styling = {
        baseFontSize: 10,
        titleFontSize: 11,
        smallFontSize: 9,
        lineHeight: 1.2,
        letterSpacing: "normal",
        marginPx: 8,
        marginPt: 6,
        paddingPx: 5,
        paddingPt: 3.75,
        borderWidthPx: 1.5,
        borderWidthPt: 1.125,
        topPaddingAdjustment: 6,
        sectionSpacing: 5,
        barcodeWidth: 1.2,
        barcodeHeight: 30,
      }
    } else {
      styling = {
        baseFontSize: 12,
        titleFontSize: 13,
        smallFontSize: 11,
        lineHeight: 1.3,
        letterSpacing: "normal",
        marginPx: 10,
        marginPt: 7.5,
        paddingPx: 6,
        paddingPt: 4.5,
        borderWidthPx: 1.5,
        borderWidthPt: 1.125,
        topPaddingAdjustment: 8,
        sectionSpacing: 6,
        barcodeWidth: 1.2,
        barcodeHeight: 35,
      }
    }

    // Format order data (EXACT same formatting for both print and PDF)
    const formattedOrder = {
      id: billData.bill_id,
      name: billData.customer_details.name,
      toAddress: {
        name: billData.customer_details.name,
        street: billData.customer_details.street,
        city: billData.customer_details.district,
        state: billData.customer_details.state,
        zipCode: billData.customer_details.pincode,
        phone: billData.customer_details.phone,
      },
      shipVia: billData.shipping_details?.method_name || "Standard Shipping",
      products: billData.product_details,
      totalItems: billData.product_details.reduce((total: number, product: any) => total + product.quantity, 0),
      orderDate: `${billData.bill_details.date}, ${billData.bill_details.time}`,
    }

    // Format from address (EXACT same formatting)
    const formattedFromAddress = {
      name: billData.organisation_details?.Name || fromAddr.name,
      street: billData.organisation_details?.street || fromAddr.street,
      city: billData.organisation_details?.district || fromAddr.city,
      state: billData.organisation_details?.state || fromAddr.state,
      zipCode: billData.organisation_details?.pincode || fromAddr.zipCode,
      phone: billData.organisation_details?.phone || fromAddr.phone,
    }

    // IMPROVED Format products text with better truncation logic
    const formatProductsList = (products: Array<{ productName?: string; name?: string; quantity: number }>): string => {
      if (!products || products.length === 0) {
        return "No products"
      }

      const maxLength = template?.id === "2x4" ? 12 : template?.id === "4x4" ? 20 : 30

      return products
        .map((product) => {
          const productName = product.productName || product.name || "Unknown Product"
          const truncatedName =
            productName.length > maxLength ? productName.substring(0, maxLength - 1) + "…" : productName
          return `${truncatedName} × ${product.quantity}`
        })
        .join(", ")
    }

    const productText = formatProductsList(formattedOrder.products)

    // IMPROVED Calculate box dimensions with better proportions and spacing
    const availableHeight = templateHeightPt - 2 * styling.marginPt - styling.topPaddingAdjustment
    const headerHeight = styling.titleFontSize * 3 // Ship via + Order ID + spacing
    const barcodeHeight = styling.barcodeHeight + 20 // Barcode + margins
    const remainingHeight = availableHeight - headerHeight - barcodeHeight

    // Adjust box heights to ensure product section starts below mobile number
    const toAddressBoxHeight = Math.max(remainingHeight * 0.32, 55) // Slightly reduced
    const detailBoxHeight = Math.max(remainingHeight * 0.32, 55) // Increased to accommodate mobile number
    const productSectionSpacing = styling.sectionSpacing + 2 // Extra spacing between boxes
    console.log(productSectionSpacing)
    return {
      templateWidth,
      templateHeight,
      templateWidthPt,
      templateHeightPt,
      ...styling,
      toAddressBoxHeight,
      detailBoxHeight,
      formattedOrder,
      fromAddress: formattedFromAddress,
      productText,
    }
  }

  // UNIFIED BARCODE GENERATOR
  const generateBarcodeImage = async (text: string, layout: UnifiedLayoutData): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = layout.barcodeWidth * 80
        canvas.height = layout.barcodeHeight

        if (typeof window !== "undefined" && window.JsBarcode) {
          window.JsBarcode(canvas, text, {
            format: "CODE128",
            width: layout.barcodeWidth,
            height: layout.barcodeHeight,
            displayValue: false,
            margin: 0,
            background: "#ffffff",
            lineColor: "#000000",
          })
          resolve(canvas.toDataURL("image/png"))
        } else {
          resolve("")
        }
      } catch (error) {
        console.warn("Barcode generation failed:", error)
        resolve("")
      }
    })
  }

  // IMPROVED UNIFIED PRINT CONTENT GENERATOR with better box alignment
  const generatePrintContent = (layout: UnifiedLayoutData, barcodeDataUrl = ""): string => {
    const { formattedOrder, fromAddress: fromAddr } = layout

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Print Label - ${formattedOrder.id}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"></script>
        <style>
          @media print {
            @page {
              size: ${layout.templateWidthPt / 72}in ${layout.templateHeightPt / 72}in;
              margin: 0;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${layout.templateWidth}px !important;
              height: ${layout.templateHeight}px !important;
              max-height: ${layout.templateHeight}px !important;
              overflow: hidden !important;
            }
            .container {
              width: 100% !important;
              height: 100% !important;
              page-break-after: always;
              overflow: hidden !important;
              box-sizing: border-box;
              padding: ${layout.paddingPx}px !important;
              border: 0 !important;
            }
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            font-size: ${layout.baseFontSize}px;
            line-height: ${layout.lineHeight};
            font-weight: normal;
            letter-spacing: ${layout.letterSpacing};
          }

          .container {
            width: ${layout.templateWidth}px;
            height: ${layout.templateHeight}px;
            margin: 0 auto;
            padding: ${layout.paddingPx}px;
            box-sizing: border-box;
            position: relative;
            border: 0;
            display: flex;
            flex-direction: column;
          }

          .header {
            font-size: ${layout.baseFontSize}px;
            font-weight: normal;
            margin-bottom: 4px;
            text-align: left;
            flex-shrink: 0;
          }

          .order-id {
            font-size: ${layout.baseFontSize}px;
            font-weight: normal;
            margin-bottom: 6px;
            text-align: center;
            flex-shrink: 0;
          }

          .barcode-wrapper {
            text-align: center;
            margin: 6px auto 8px auto;
            height: ${layout.barcodeHeight}px;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            flex-shrink: 0;
          }

          .barcode-img {
            height: ${layout.barcodeHeight}px;
            max-width: 90%;
          }

          .address-box {
            border: ${layout.borderWidthPx}px solid #000;
            padding: ${layout.paddingPx}px;
            margin-bottom: ${layout.sectionSpacing}px;
            height: ${layout.toAddressBoxHeight}px;
            overflow: hidden;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }

          .to-name {
            font-weight: bold;
            font-size: ${layout.baseFontSize}px;
            margin-bottom: 2px;
            line-height: ${layout.lineHeight};
          }

          .address-line {
            font-size: ${layout.baseFontSize}px;
            line-height: ${layout.lineHeight};
            margin-bottom: 1px;
          }

          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${layout.sectionSpacing}px;
            margin-bottom: ${layout.sectionSpacing + 2}px;
            flex-shrink: 0;
          }

          .detail-box {
            border: ${layout.borderWidthPx}px solid #000;
            padding: ${layout.paddingPx}px;
            height: ${layout.detailBoxHeight}px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }

          .detail-title {
            font-weight: bold;
            font-size: ${layout.baseFontSize}px;
            margin-bottom: 2px;
            line-height: ${layout.lineHeight};
          }

          .detail-line {
            font-size: ${layout.smallFontSize}px;
            line-height: ${layout.lineHeight};
            margin-bottom: 1px;
          }

          .product-section {
            border: ${layout.borderWidthPx}px solid #000;
            padding: ${layout.paddingPx}px;
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            margin-top: ${layout.sectionSpacing}px;
            min-height: 0;
          }

          .product-title {
            font-weight: bold;
            font-size: ${layout.baseFontSize}px;
            margin-bottom: 2px;
            line-height: ${layout.lineHeight};
            flex-shrink: 0;
          }

          .product-list {
            font-size: ${layout.smallFontSize}px;
            line-height: ${layout.lineHeight};
            word-wrap: break-word;
            overflow-wrap: break-word;
            flex: 1;
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            Ship Via: ${formattedOrder.shipVia}
          </div>
         
          <div class="order-id">
            ${fromAddr.name} Order ID: ${formattedOrder.id}
          </div>
         
          <div class="barcode-wrapper">
            ${
              barcodeDataUrl
                ? `<img src="${barcodeDataUrl}" class="barcode-img" alt="Barcode ${formattedOrder.id}" />`
                : `<svg id="barcode-${formattedOrder.id}" class="barcode-img"></svg>`
            }
          </div>
         
          <div class="address-box">
            <div class="to-name">TO ${formattedOrder.toAddress.name}</div>
            <div class="address-line">${formattedOrder.toAddress.street}</div>
            <div class="address-line">${formattedOrder.toAddress.city}</div>
            <div class="address-line">${formattedOrder.toAddress.state} ${formattedOrder.toAddress.zipCode}</div>
            <div class="address-line">${formattedOrder.toAddress.phone}</div>
          </div>
         
          <div class="details-grid">
            <div class="detail-box">
              <div class="detail-title">From:</div>
              <div class="detail-line">${fromAddr.name}</div>
              <div class="detail-line">${fromAddr.street}</div>
              <div class="detail-line">${fromAddr.city}</div>
              <div class="detail-line">${fromAddr.state}-${fromAddr.zipCode}</div>
              <div class="detail-line">Mobile: ${fromAddr.phone}</div>
            </div>
           
            <div class="detail-box">
              <div class="detail-title">Prepaid Order:</div>
              <div class="detail-line">Date: ${formattedOrder.orderDate}</div>
              <div class="detail-line">Weight:</div>
              <div class="detail-line">No. of Items: ${formattedOrder.totalItems}</div>
              <div class="detail-line">Source: Instagram</div>
              <div class="detail-line">Packed By:</div>
            </div>
          </div>
         
          <div class="product-section">
            <div class="product-title">Products:</div>
            <div class="product-list">
              ${layout.productText}
            </div>
          </div>
        </div>
        ${
          !barcodeDataUrl
            ? `
        <script>
          window.onload = function() {
            JsBarcode("#barcode-${formattedOrder.id}", "${formattedOrder.id}", {
              format: "CODE128",
              width: ${layout.barcodeWidth},
              height: ${layout.barcodeHeight},
              displayValue: false,
              margin: 0
            });
           
            setTimeout(() => {
              window.print();
              setTimeout(() => window.close(), 500);
            }, 500);
          };
        </script>
        `
            : ""
        }
      </body>
    </html>
  `
  }

  // IMPROVED PDF GENERATOR with better alignment
  const downloadBillDataAsPDF = async (billId: string, billData?: any) => {
    try {
      let dataToDownload = billData

      if (!dataToDownload && billId) {
        const response = await publicApi.get(`/api/printingroute/print-bill/${billId}`, {
          headers: {
            "tenent-id": tenentId || "",
          },
        })
        dataToDownload = response.data
      }

      if (!dataToDownload) {
        console.error("No bill data available for download")
        return
      }

      // Generate EXACT same layout data as print preview
      const layout = generateUnifiedLayoutData(dataToDownload, selectedTemplate, previewFromAddress)

      // Create PDF with exact template dimensions
      const doc = new jsPDF({
        orientation: layout.templateWidthPt > layout.templateHeightPt ? "landscape" : "portrait",
        unit: "pt",
        format: [layout.templateWidthPt, layout.templateHeightPt],
      })

      doc.setProperties({
        title: `Bill ${billId}`,
        subject: `Bill ${billId}`,
        author: layout.fromAddress.name,
        creator: "Print Management System",
      })

      // Generate barcode with EXACT same settings as print
      const barcodeDataUrl = await generateBarcodeImage(layout.formattedOrder.id, layout)

      // Use EXACT positioning as print layout - start with proper top margin
      let yPos = layout.marginPt + layout.topPaddingAdjustment

      // Ship Via header - EXACT same styling as print
      doc.setFont("helvetica", "normal")
      doc.setFontSize(layout.baseFontSize)
      doc.text(`Ship Via: ${layout.formattedOrder.shipVia}`, layout.marginPt, yPos)
      yPos += layout.baseFontSize * 1.5

      // Order ID (centered) - EXACT same styling as print
      const orderText = `${layout.fromAddress.name} Order ID: ${layout.formattedOrder.id}`
      const textWidth = doc.getTextWidth(orderText)
      doc.text(orderText, (layout.templateWidthPt - textWidth) / 2, yPos)
      yPos += layout.baseFontSize * 1.8

      // Add barcode EXACTLY as in print
      if (barcodeDataUrl) {
        const barcodeWidthPt = layout.barcodeWidth * 80 * 0.75
        const barcodeHeightPt = layout.barcodeHeight * 0.75
        doc.addImage(
          barcodeDataUrl,
          "PNG",
          (layout.templateWidthPt - barcodeWidthPt) / 2,
          yPos,
          barcodeWidthPt,
          barcodeHeightPt,
        )
        yPos += barcodeHeightPt + 12
      } else {
        yPos += 35
      }

      // TO Address box - EXACT same layout as print with proper height
      doc.setLineWidth(layout.borderWidthPt)
      doc.rect(layout.marginPt, yPos, layout.templateWidthPt - 2 * layout.marginPt, layout.toAddressBoxHeight)

      let addressYPos = yPos + layout.paddingPt + 8
      doc.setFont("helvetica", "bold")
      doc.setFontSize(layout.baseFontSize)
      doc.text(`TO ${layout.formattedOrder.toAddress.name}`, layout.marginPt + layout.paddingPt, addressYPos)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(layout.baseFontSize)
      addressYPos += layout.baseFontSize * layout.lineHeight

      const fullStreet =
        (dataToDownload.customer_details.flat_no ? dataToDownload.customer_details.flat_no + ", " : "") +
        layout.formattedOrder.toAddress.street
      doc.text(fullStreet, layout.marginPt + layout.paddingPt, addressYPos)
      addressYPos += layout.baseFontSize * layout.lineHeight
      doc.text(layout.formattedOrder.toAddress.city, layout.marginPt + layout.paddingPt, addressYPos)
      addressYPos += layout.baseFontSize * layout.lineHeight
      doc.text(
        `${layout.formattedOrder.toAddress.state} ${layout.formattedOrder.toAddress.zipCode}`,
        layout.marginPt + layout.paddingPt,
        addressYPos,
      )
      addressYPos += layout.baseFontSize * layout.lineHeight
      doc.text(layout.formattedOrder.toAddress.phone, layout.marginPt + layout.paddingPt, addressYPos)

      yPos += layout.toAddressBoxHeight + layout.sectionSpacing

      // From and Order details (two columns) - EXACT same layout as print
      const colWidth = (layout.templateWidthPt - 3 * layout.marginPt - layout.sectionSpacing) / 2

      // From address box
      doc.setLineWidth(layout.borderWidthPt)
      doc.rect(layout.marginPt, yPos, colWidth, layout.detailBoxHeight)
      let fromYPos = yPos + layout.paddingPt + 8
      doc.setFont("helvetica", "bold")
      doc.setFontSize(layout.baseFontSize)
      doc.text("From:", layout.marginPt + layout.paddingPt, fromYPos)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(layout.smallFontSize)
      fromYPos += layout.baseFontSize * layout.lineHeight
      doc.text(layout.fromAddress.name, layout.marginPt + layout.paddingPt, fromYPos)
      fromYPos += layout.smallFontSize * layout.lineHeight
      doc.text(layout.fromAddress.street, layout.marginPt + layout.paddingPt, fromYPos)
      fromYPos += layout.smallFontSize * layout.lineHeight
      doc.text(layout.fromAddress.city, layout.marginPt + layout.paddingPt, fromYPos)
      fromYPos += layout.smallFontSize * layout.lineHeight
      doc.text(
        `${layout.fromAddress.state}-${layout.fromAddress.zipCode}`,
        layout.marginPt + layout.paddingPt,
        fromYPos,
      )
      fromYPos += layout.smallFontSize * layout.lineHeight
      doc.text(`Mobile: ${layout.fromAddress.phone}`, layout.marginPt + layout.paddingPt, fromYPos)

      // Order details box
      const rightColX = layout.marginPt + colWidth + layout.sectionSpacing
      doc.setLineWidth(layout.borderWidthPt)
      doc.rect(rightColX, yPos, colWidth, layout.detailBoxHeight)
      let orderYPos = yPos + layout.paddingPt + 8
      doc.setFont("helvetica", "bold")
      doc.setFontSize(layout.baseFontSize)
      doc.text("Prepaid Order:", rightColX + layout.paddingPt, orderYPos)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(layout.smallFontSize)
      orderYPos += layout.baseFontSize * layout.lineHeight
      doc.text(`Date: ${layout.formattedOrder.orderDate}`, rightColX + layout.paddingPt, orderYPos)
      orderYPos += layout.smallFontSize * layout.lineHeight
      doc.text(`Weight:`, rightColX + layout.paddingPt, orderYPos)
      orderYPos += layout.smallFontSize * layout.lineHeight
      doc.text(`No. of Items: ${layout.formattedOrder.totalItems}`, rightColX + layout.paddingPt, orderYPos)
      orderYPos += layout.smallFontSize * layout.lineHeight
      doc.text("Source: Instagram", rightColX + layout.paddingPt, orderYPos)
      orderYPos += layout.smallFontSize * layout.lineHeight
      doc.text("Packed By:", rightColX + layout.paddingPt, orderYPos)

      yPos += layout.detailBoxHeight + layout.sectionSpacing + 2 // Extra spacing before product section

      // Products section - EXACT same layout as print
      const remainingHeight = layout.templateHeightPt - yPos - layout.marginPt
      doc.setLineWidth(layout.borderWidthPt)
      doc.rect(layout.marginPt, yPos, layout.templateWidthPt - 2 * layout.marginPt, remainingHeight)

      let productYPos = yPos + layout.paddingPt + 8
      doc.setFont("helvetica", "bold")
      doc.setFontSize(layout.baseFontSize)
      doc.text("Products:", layout.marginPt + layout.paddingPt, productYPos)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(layout.smallFontSize)
      productYPos += layout.baseFontSize * layout.lineHeight

      const maxWidth = layout.templateWidthPt - 2 * layout.marginPt - 2 * layout.paddingPt
      const lines = doc.splitTextToSize(layout.productText, maxWidth)

      lines.forEach((line: string) => {
        if (productYPos < layout.templateHeightPt - layout.marginPt - layout.paddingPt) {
          doc.text(line, layout.marginPt + layout.paddingPt, productYPos)
          productYPos += layout.smallFontSize * layout.lineHeight
        }
      })

      // Save with exact same filename format as original
      doc.save(`bill_${selectedTemplate?.name || "default"}_${billId}_${new Date().toISOString().split("T")[0]}.pdf`)

      console.log(
        `Bill for ${billId} downloaded as PDF with EXACT print preview match using ${selectedTemplate?.name || "default"} template`,
      )
    } catch (error) {
      console.error("Error downloading bill as PDF:", error)
      alert("Error generating PDF. Please try again.")
    }
  }

  // IMPROVED BULK PDF GENERATOR with perfect alignment
  const downloadBulkBillsDataAsPDF = async (bills: BillResponseType[]) => {
    try {
      // Use the first bill to determine layout (all bills will use same template)
      const firstBillLayout = generateUnifiedLayoutData(bills[0], selectedTemplate, previewFromAddress)

      const doc = new jsPDF({
        orientation: firstBillLayout.templateWidthPt > firstBillLayout.templateHeightPt ? "landscape" : "portrait",
        unit: "pt",
        format: [firstBillLayout.templateWidthPt, firstBillLayout.templateHeightPt],
      })

      doc.setProperties({
        title: `Bulk Shipping Labels`,
        subject: `Bulk Shipping Labels for ${bills.length} orders`,
        author: firstBillLayout.fromAddress.name,
        creator: "Print Management System",
      })

      // Generate each bill as a separate page with EXACT same layout as print preview
      for (let index = 0; index < bills.length; index++) {
        const bill = bills[index]

        if (index > 0) {
          doc.addPage()
        }

        // Generate EXACT same layout data as print preview for this bill
        const layout = generateUnifiedLayoutData(bill, selectedTemplate, previewFromAddress)

        // Use EXACT positioning as print layout
        let yPos = layout.marginPt + layout.topPaddingAdjustment

        // Ship Via header
        doc.setFont("helvetica", "normal")
        doc.setFontSize(layout.baseFontSize)
        doc.text(`Ship Via: ${layout.formattedOrder.shipVia}`, layout.marginPt, yPos)
        yPos += layout.baseFontSize * 1.5

        // Order ID (centered)
        const orderText = `${layout.fromAddress.name} Order ID: ${bill.bill_details.bill_no}`
        const textWidth = doc.getTextWidth(orderText)
        doc.text(orderText, (layout.templateWidthPt - textWidth) / 2, yPos)
        yPos += layout.baseFontSize * 1.8

        // Generate and add barcode EXACTLY as in print
        try {
          const barcodeDataUrl = await generateBarcodeImage(bill.bill_details.bill_no.toString(), layout)
          if (barcodeDataUrl) {
            const barcodeWidthPt = layout.barcodeWidth * 80 * 0.75
            const barcodeHeightPt = layout.barcodeHeight * 0.75
            doc.addImage(
              barcodeDataUrl,
              "PNG",
              (layout.templateWidthPt - barcodeWidthPt) / 2,
              yPos,
              barcodeWidthPt,
              barcodeHeightPt,
            )
            yPos += barcodeHeightPt + 12
          } else {
            // Fallback to text
            doc.setFont("helvetica", "normal")
            doc.setFontSize(layout.smallFontSize)
            const barcodeText = `[BARCODE: ${bill.bill_details.bill_no}]`
            const textWidth = doc.getTextWidth(barcodeText)
            doc.text(barcodeText, (layout.templateWidthPt - textWidth) / 2, yPos + 15)
            yPos += 35
          }
        } catch (error) {
          console.warn("Barcode generation failed, using text fallback:", error)
          doc.setFont("helvetica", "normal")
          doc.setFontSize(layout.smallFontSize)
          const barcodeText = `[BARCODE: ${bill.bill_details.bill_no}]`
          const textWidth = doc.getTextWidth(barcodeText)
          doc.text(barcodeText, (layout.templateWidthPt - textWidth) / 2, yPos + 15)
          yPos += 35
        }

        // TO Address box with proper height
        doc.setLineWidth(layout.borderWidthPt)
        doc.rect(layout.marginPt, yPos, layout.templateWidthPt - 2 * layout.marginPt, layout.toAddressBoxHeight)

        let addressYPos = yPos + layout.paddingPt + 8
        doc.setFont("helvetica", "bold")
        doc.setFontSize(layout.baseFontSize)
        doc.text(`TO ${layout.formattedOrder.toAddress.name}`, layout.marginPt + layout.paddingPt, addressYPos)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(layout.baseFontSize)
        addressYPos += layout.baseFontSize * layout.lineHeight

        const fullStreet =
          (bill.customer_details.flat_no ? bill.customer_details.flat_no + ", " : "") + bill.customer_details.street
        doc.text(fullStreet, layout.marginPt + layout.paddingPt, addressYPos)
        addressYPos += layout.baseFontSize * layout.lineHeight
        doc.text(layout.formattedOrder.toAddress.city, layout.marginPt + layout.paddingPt, addressYPos)
        addressYPos += layout.baseFontSize * layout.lineHeight
        doc.text(
          `${layout.formattedOrder.toAddress.state} ${layout.formattedOrder.toAddress.zipCode}`,
          layout.marginPt + layout.paddingPt,
          addressYPos,
        )
        addressYPos += layout.baseFontSize * layout.lineHeight
        doc.text(layout.formattedOrder.toAddress.phone, layout.marginPt + layout.paddingPt, addressYPos)

        yPos += layout.toAddressBoxHeight + layout.sectionSpacing

        // From and Order details with proper spacing
        const colWidth = (layout.templateWidthPt - 3 * layout.marginPt - layout.sectionSpacing) / 2

        // From address box
        doc.setLineWidth(layout.borderWidthPt)
        doc.rect(layout.marginPt, yPos, colWidth, layout.detailBoxHeight)
        let fromYPos = yPos + layout.paddingPt + 8
        doc.setFont("helvetica", "bold")
        doc.setFontSize(layout.baseFontSize)
        doc.text("From:", layout.marginPt + layout.paddingPt, fromYPos)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(layout.smallFontSize)
        fromYPos += layout.baseFontSize * layout.lineHeight
        doc.text(layout.fromAddress.name, layout.marginPt + layout.paddingPt, fromYPos)
        fromYPos += layout.smallFontSize * layout.lineHeight
        doc.text(layout.fromAddress.street, layout.marginPt + layout.paddingPt, fromYPos)
        fromYPos += layout.smallFontSize * layout.lineHeight
        doc.text(layout.fromAddress.city, layout.marginPt + layout.paddingPt, fromYPos)
        fromYPos += layout.smallFontSize * layout.lineHeight
        doc.text(
          `${layout.fromAddress.state}-${layout.fromAddress.zipCode}`,
          layout.marginPt + layout.paddingPt,
          fromYPos,
        )
        fromYPos += layout.smallFontSize * layout.lineHeight
        doc.text(`Mobile: ${layout.fromAddress.phone}`, layout.marginPt + layout.paddingPt, fromYPos)

        // Order details box
        const rightColX = layout.marginPt + colWidth + layout.sectionSpacing
        doc.setLineWidth(layout.borderWidthPt)
        doc.rect(rightColX, yPos, colWidth, layout.detailBoxHeight)
        let orderYPos = yPos + layout.paddingPt + 8
        doc.setFont("helvetica", "bold")
        doc.setFontSize(layout.baseFontSize)
        doc.text("Prepaid Order:", rightColX + layout.paddingPt, orderYPos)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(layout.smallFontSize)
        orderYPos += layout.baseFontSize * layout.lineHeight
        doc.text(`Date: ${layout.formattedOrder.orderDate}`, rightColX + layout.paddingPt, orderYPos)
        orderYPos += layout.smallFontSize * layout.lineHeight
        doc.text(`Weight: ${bill.shipping_details?.weight || ""}`, rightColX + layout.paddingPt, orderYPos)
        orderYPos += layout.smallFontSize * layout.lineHeight
        doc.text(`No. of Items: ${layout.formattedOrder.totalItems}`, rightColX + layout.paddingPt, orderYPos)
        orderYPos += layout.smallFontSize * layout.lineHeight
        doc.text("Source: Instagram", rightColX + layout.paddingPt, orderYPos)
        orderYPos += layout.smallFontSize * layout.lineHeight
        doc.text("Packed By: ", rightColX + layout.paddingPt, orderYPos)
        yPos += layout.detailBoxHeight + layout.sectionSpacing + 2 // Extra spacing before product section
       

        // Products section with proper spacing
        const remainingHeight = layout.templateWidthPt - yPos - layout.marginPt
        doc.setLineWidth(layout.borderWidthPt)
        doc.rect(layout.marginPt, yPos, layout.templateWidthPt - 2 * layout.marginPt, remainingHeight)

        let productYPos = yPos + layout.paddingPt + 8
        doc.setFont("helvetica", "bold")
        doc.setFontSize(layout.baseFontSize)
        doc.text("Products:", layout.marginPt + layout.paddingPt, productYPos)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(layout.smallFontSize)
        productYPos += layout.baseFontSize * layout.lineHeight

        const maxWidth = layout.templateWidthPt - 2 * layout.marginPt - 2 * layout.paddingPt
        const lines = doc.splitTextToSize(layout.productText, maxWidth)

        lines.forEach((line: string) => {
          if (productYPos < layout.templateHeightPt - layout.marginPt - layout.paddingPt) {
            doc.text(line, layout.marginPt + layout.paddingPt, productYPos)
            productYPos += layout.smallFontSize * layout.lineHeight
          }
        })
      }

      // Save the PDF
      doc.save(
        `bulk_shipping_labels_${selectedTemplate?.name || "default"}_${new Date().toISOString().split("T")[0]}.pdf`,
      )

      console.log(
        `Bulk shipping labels (${bills.length} labels) downloaded as PDF with EXACT print preview match using ${selectedTemplate?.name || "default"} template`,
      )
    } catch (error) {
      console.error("Error downloading bulk shipping labels as PDF:", error)
      alert("Error generating bulk PDF. Please try again.")
    }
  }

  const handlePrintBill = async (billId: string) => {
    if (!billId) {
      alert("Please enter a bill ID")
      return
    }

    try {
      setIsLoading(true)

      const response = await publicApi.get(`/api/printingroute/print-bill/${billId}`, {
        headers: {
          "tenent-id": tenentId || "",
        },
      })

      if (!response.data) {
        throw new Error("No data returned from server")
      }

      const responseOrder: BillResponseType = response.data

      // Format order data
      const formattedOrder: OrderType = {
        id: responseOrder.bill_id,
        name: responseOrder.customer_details.name,
        toAddress: {
          name: responseOrder.customer_details.name,
          street: responseOrder.customer_details.street,
          city: responseOrder.customer_details.district,
          state: responseOrder.customer_details.state,
          zipCode: responseOrder.customer_details.pincode,
          phone: responseOrder.customer_details.phone,
        },
        isPrepaid: true,
        orderDate: `${responseOrder.bill_details.date}, ${responseOrder.bill_details.time}`,
        shipVia: responseOrder.shipping_details?.method_name || "Standard Shipping",
        products: responseOrder.product_details.map((product) => ({
          name: product.productName,
          quantity: product.quantity,
        })),
        totalItems: responseOrder.product_details.reduce((total, product) => total + product.quantity, 0),
        packedBy: "Team",
        weight: responseOrder.shipping_details?.weight || "0.5 kg",
      }

      setCurrentOrder(formattedOrder)

      // Add to print history
      const updatedHistory = [billId, ...printHistory.filter((id) => id !== billId)].slice(0, 10)
      setPrintHistory(updatedHistory)
      localStorage.setItem("printHistory", JSON.stringify(updatedHistory))

      // Generate UNIFIED layout data for EXACT consistency
      const layout = generateUnifiedLayoutData(responseOrder, selectedTemplate, previewFromAddress)

      // Generate print content using UNIFIED system
      const printContent = generatePrintContent(layout)
      const printWindow = window.open("", "_blank")

      if (!printWindow) {
        alert("Unable to open print window. Please disable your pop-up blocker and try again.")
        return
      }

      printWindow.document.open()
      printWindow.document.write(printContent)
      printWindow.document.close()

      // Auto-download bill data as PDF after successful print setup
      setTimeout(() => {
        downloadBillDataAsPDF(billId, responseOrder)
      }, 1000)
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to print bill. Please try again."}`)
      console.error("Print error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkPrint = async () => {
    if (!isAddressSaved) {
      alert("Please enter your shipping from address before printing in bulk")
      return
    }

    try {
      setIsLoading(true)
      const response = await publicApi.get("/api/printingroute/bulkPrinting", {
        headers: {
          "tenent-id": tenentId || "",
        },
      })

      if (!response.data.bills || response.data.bills.length === 0) {
        alert("No bills available for printing")
        return
      }

      const printContent = generateBulkPrintContent(response.data.bills)
      const printWindow = window.open("", "_blank")

      if (!printWindow) {
        alert("Unable to open print window. Please disable your pop-up blocker and try again.")
        return
      }

      printWindow.document.open()
      printWindow.document.write(printContent)
      printWindow.document.close()

      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus()
            printWindow.print()
            setBills(0)
          } catch (error) {
            console.error("Print error:", error)
            alert("There was an error while trying to print. Please try again.")
          } finally {
            printWindow.close()

            // Auto-download all bills data as PDF after bulk print
            setTimeout(() => {
              downloadBulkBillsDataAsPDF(response.data.bills)
            }, 1000)
          }
        }, 500)
      }
    } catch (error: any) {
      alert(`Error: ${error.message || "Error during printing. Please try again."}`)
      console.error("Bulk print error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // IMPROVED BULK PRINT CONTENT GENERATOR with perfect box alignment
  const generateBulkPrintContent = (bills: BillResponseType[]) => {
    // Use first bill to determine template settings (all bills use same template)
    const firstLayout = generateUnifiedLayoutData(bills[0], selectedTemplate, previewFromAddress)

    const styles = `
     <style>
       @media print {
         @page {
           size: ${firstLayout.templateWidthPt / 72}in ${firstLayout.templateHeightPt / 72}in;
           margin: 0;
         }
         body {
           margin: 0 !important;
           padding: 0 !important;
           width: ${firstLayout.templateWidth}px !important;
           height: ${firstLayout.templateHeight}px !important;
           max-height: ${firstLayout.templateHeight}px !important;
           overflow: hidden !important;
         }
         .page-container {
           width: 100% !important;
           height: 100% !important;
           page-break-after: always;
           overflow: hidden !important;
           box-sizing: border-box;
         }
         .container {
           width: 100% !important;
           height: 100% !important;
           page-break-after: always;
           overflow: hidden !important;
           box-sizing: border-box;
           padding: ${firstLayout.paddingPx}px !important;
           border: 0 !important;
           display: flex !important;
           flex-direction: column !important;
         }
       }
       
       * {
         box-sizing: border-box;
       }
       
       html, body {
         margin: 0;
         padding: 0;
         font-family: Arial, sans-serif;
         font-size: ${firstLayout.baseFontSize}px;
         line-height: ${firstLayout.lineHeight};
         font-weight: normal;
         letter-spacing: ${firstLayout.letterSpacing};
       }
       
       .page-container {
         width: ${firstLayout.templateWidth}px;
         height: ${firstLayout.templateHeight}px;
         page-break-after: always;
         margin: 0 auto;
         box-sizing: border-box;
         position: relative;
       }
       
       .container {
         width: ${firstLayout.templateWidth}px;
         height: ${firstLayout.templateHeight}px;
         margin: 0 auto;
         padding: ${firstLayout.paddingPx}px;
         box-sizing: border-box;
         position: relative;
         border: 0;
         display: flex;
         flex-direction: column;
       }
       
       .header {
         font-size: ${firstLayout.baseFontSize}px;
         font-weight: normal;
         margin-bottom: 4px;
         text-align: left;
         flex-shrink: 0;
       }
       
       .order-id {
         font-size: ${firstLayout.baseFontSize}px;
         font-weight: normal;
         margin-bottom: 6px;
         text-align: center;
         flex-shrink: 0;
       }
       
       .barcode-wrapper {
         text-align: center;
         margin: 6px auto 8px auto;
         height: ${firstLayout.barcodeHeight}px;
         display: flex;
         justify-content: center;
         align-items: center;
         width: 100%;
         flex-shrink: 0;
       }
       
       .barcode-img {
         max-height: 100%;
         max-width: 90%;
       }
       
       .address-box {
         border: ${firstLayout.borderWidthPx}px solid #000;
         padding: ${firstLayout.paddingPx}px;
         margin-bottom: ${firstLayout.sectionSpacing}px;
         height: ${firstLayout.toAddressBoxHeight}px;
         overflow: hidden;
         flex-shrink: 0;
         display: flex;
         flex-direction: column;
         justify-content: flex-start;
       }
       
       .to-name {
         font-weight: bold;
         font-size: ${firstLayout.baseFontSize}px;
         margin-bottom: 2px;
         line-height: ${firstLayout.lineHeight};
         white-space: nowrap;
         overflow: hidden;
         text-overflow: ellipsis;
       }
       
       .address-line {
         font-size: ${firstLayout.baseFontSize}px;
         line-height: ${firstLayout.lineHeight};
         margin-bottom: 1px;
         white-space: nowrap;
         overflow: hidden;
         text-overflow: ellipsis;
       }
       
       .details-grid {
         display: grid;
         grid-template-columns: 1fr 1fr;
         gap: ${firstLayout.sectionSpacing}px;
         margin-bottom: ${firstLayout.sectionSpacing}px;
         flex-shrink: 0;
       }
       
       .detail-box {
         border: ${firstLayout.borderWidthPx}px solid #000;
         padding: ${firstLayout.paddingPx}px;
         height: ${firstLayout.detailBoxHeight}px;
         overflow: hidden;
         display: flex;
         flex-direction: column;
         justify-content: flex-start;
       }
       
       .detail-title {
         font-weight: bold;
         font-size: ${firstLayout.baseFontSize}px;
         margin-bottom: 2px;
         line-height: ${firstLayout.lineHeight};
       }
       
       .detail-line {
         font-size: ${firstLayout.smallFontSize}px;
         line-height: ${firstLayout.lineHeight};
         margin-bottom: 1px;
         white-space: nowrap;
         overflow: hidden;
         text-overflow: ellipsis;
       }

       .product-section {
         border: ${firstLayout.borderWidthPx}px solid #000;
         padding: ${firstLayout.paddingPx}px;
         flex: 1;
         overflow: hidden;
         display: flex;
         flex-direction: column;
         min-height: 0;
         margin-top: ${firstLayout.sectionSpacing + 2}px;
       }

       .product-title {
         font-weight: bold;
         font-size: ${firstLayout.baseFontSize}px;
         margin-bottom: 2px;
         line-height: ${firstLayout.lineHeight};
         flex-shrink: 0;
       }

       .product-list {
         font-size: ${firstLayout.smallFontSize}px;
         line-height: ${firstLayout.lineHeight};
         word-wrap: break-word;
         overflow-wrap: break-word;
         flex: 1;
         overflow: hidden;
         display: -webkit-box;
         -webkit-box-orient: vertical;
         -webkit-line-clamp: 4;
       }
     </style>
   `

    // Generate HTML for all bills using IMPROVED layout system
    const generateLabelHTML = (bill: BillResponseType) => {
      // Generate EXACT same layout data as print preview for each bill
      const layout = generateUnifiedLayoutData(bill, selectedTemplate, previewFromAddress)

      return `
     <div class="page-container">
       <div class="container">
         <div class="header">
           Ship Via: ${layout.formattedOrder.shipVia}
         </div>
         
         <div class="order-id">
           ${layout.fromAddress.name} Order ID: ${bill.bill_details.bill_no}
         </div>
         
         <div class="barcode-wrapper">
           <svg id="barcode-${bill.bill_id}" class="barcode-img"></svg>
         </div>
         
         <div class="address-box">
           <div class="to-name">TO ${layout.formattedOrder.toAddress.name}</div>
           <div class="address-line">${(bill.customer_details.flat_no ? bill.customer_details.flat_no + ", " : "") + bill.customer_details.street}</div>
           <div class="address-line">${bill.customer_details.district}</div>
           <div class="address-line">${bill.customer_details.state} ${bill.customer_details.pincode}</div>
           <div class="address-line">${bill.customer_details.phone}</div>
         </div>
         
         <div class="details-grid">
           <div class="detail-box">
             <div class="detail-title">From:</div>
             <div class="detail-line">${layout.fromAddress.name}</div>
             <div class="detail-line">${layout.fromAddress.street}</div>
             <div class="detail-line">${layout.fromAddress.city}</div>
             <div class="detail-line">${layout.fromAddress.state}-${layout.fromAddress.zipCode}</div>
             <div class="detail-line">Mobile: ${layout.fromAddress.phone}</div>
           </div>
           
           <div class="detail-box">
             <div class="detail-title">Prepaid Order:</div>
             <div class="detail-line">Date: ${layout.formattedOrder.orderDate}</div>
             <div class="detail-line">Weight: ${bill.shipping_details?.weight || ""}</div>
             <div class="detail-line">No. of Items: ${layout.formattedOrder.totalItems}</div>
             <div class="detail-line">Source: Instagram</div>
             <div class="detail-line">Packed By: </div>
           </div>
         </div>
         
         <div class="product-section">
           <div class="product-title">Products:</div>
           <div class="product-list">
             ${layout.productText}
           </div>
         </div>
       </div>
     </div>
   `
    }

    const billsHTML = bills.map((bill) => generateLabelHTML(bill)).join("")

    // Create barcode initialization code for each bill using UNIFIED settings
    const barcodeInitScript = bills
      .map((bill) => {
        const layout = generateUnifiedLayoutData(bill, selectedTemplate, previewFromAddress)
        return `
     JsBarcode("#barcode-${bill.bill_id}", "${bill.bill_details.bill_no}", {
       format: "CODE128",
       width: ${layout.barcodeWidth},
       height: ${layout.barcodeHeight},
       displayValue: false,
       margin: 0
     });
   `
      })
      .join("\n")

    return `
     <!DOCTYPE html>
     <html lang="en">
       <head>
         <meta charset="UTF-8">
         <title>Print Bills</title>
         ${styles}
         <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"></script>
       </head>
       <body>
         ${billsHTML}
         <script>
           document.addEventListener('DOMContentLoaded', function() {
             try {
               ${barcodeInitScript}
               
               setTimeout(function() {
                 window.print();
                 setTimeout(() => window.close(), 500);
               }, 1000);
             } catch(error) {
               console.error('Error generating barcodes:', error);
               alert('There was an error generating the barcodes. Please try again.');
             }
           });
         </script>
       </body>
     </html>
   `
  }

  const renderTemplatePreview = (template: TemplateType) => {
    return (
      <div
        className="border border-gray-300 p-2 bg-white overflow-hidden relative"
        style={{ position: "relative", height: "120px" }}
      >
        <div className="absolute inset-0 p-2">
          <ShippingLabelTemplate template={template} fromAddress={previewFromAddress} order={order} />
        </div>
      </div>
    )
  }

  const renderStepContent = () => {
    if (step === 1) {
      if (isEditingAddress) {
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Enter Shipping From Address</h2>
            <form onSubmit={handleSubmitFromAddress}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business/Name*</label>
                  <input
                    type="text"
                    name="name"
                    value={fromAddress.name}
                    onChange={handleFromAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address*</label>
                  <input
                    type="text"
                    name="street"
                    value={fromAddress.street}
                    onChange={handleFromAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City*</label>
                  <input
                    type="text"
                    name="city"
                    value={fromAddress.city}
                    onChange={handleFromAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={fromAddress.state}
                    onChange={handleFromAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP/Postal Code*</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={fromAddress.zipCode}
                    onChange={handleFromAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number*</label>
                  <input
                    type="tel"
                    name="phone"
                    value={fromAddress.phone}
                    onChange={handleFromAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        )
      } else if (showTemplateEdit) {
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Select Label Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors hover:bg-blue-50 ${selectedTemplate?.id === template.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-center mb-3">
                    <h3 className="font-medium">{template.name}</h3>
                  </div>
                  {renderTemplatePreview(template)}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTemplateEdit(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowTemplateEdit(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Save Template
              </button>
            </div>
          </div>
        )
      }

      return (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Shipping From Address</h2>
                <button
                  onClick={() => setIsEditingAddress(true)}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </button>
              </div>
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                {isAddressSaved ? (
                  <>
                    <p className="font-medium">{fromAddress.name}</p>
                    <p>{fromAddress.street}</p>
                    <p>
                      {fromAddress.city}, {fromAddress.state} {fromAddress.zipCode}
                    </p>
                    <p>Phone: {fromAddress.phone}</p>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-gray-500">No address saved</p>
                    <button onClick={() => setIsEditingAddress(true)} className="mt-2 text-blue-600 underline">
                      Add Address
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Label Template</h2>
                <button
                  onClick={() => setShowTemplateEdit(true)}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit Template
                </button>
              </div>
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50 h-40">
                {selectedTemplate ? (
                  <>
                    <div className="mb-2 text-sm text-gray-600">
                      Current template: <span className="font-medium">{selectedTemplate.name}</span>
                    </div>
                    <div className="h-28 overflow-hidden">{renderTemplatePreview(selectedTemplate)}</div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No template selected</p>
                    <button onClick={() => setShowTemplateEdit(true)} className="mt-2 text-blue-600 underline">
                      Select Template
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold mb-4">Print Options</h2>

            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Print Single Label</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={billId}
                  onChange={(e) => setBillId(e.target.value)}
                  placeholder="Enter Bill ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handlePrintBill(billId)}
                  disabled={!isAddressSaved || !selectedTemplate || !billId}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print & Download
                </button>
                <button
                  onClick={async () => {
                    if (billId) {
                      await downloadBillDataAsPDF(billId)
                      setBillId("")
                    }
                  }}
                  disabled={!billId}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download PDF
                </button>
              </div>

              {printHistory.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowPrintHistory(!showPrintHistory)}
                    className="text-sm text-blue-600 flex items-center"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    {showPrintHistory ? "Hide" : "Show"} recent bills
                  </button>

                  {showPrintHistory && (
                    <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                      <div className="text-xs text-gray-500 mb-1">Recently printed bills:</div>
                      <div className="flex flex-wrap gap-2">
                        {printHistory.map((id) => (
                          <button
                            key={id}
                            onClick={() => {
                              setBillId(id)
                              setShowPrintHistory(false)
                            }}
                            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                          >
                            {id}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Bulk Printing</h3>
              <div className="flex items-center">
                <div className="mr-4">
                  <span className="text-sm text-gray-600">You have </span>
                  <span className="font-semibold">{bills}</span>
                  <span className="text-sm text-gray-600"> pending bills</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkPrint}
                    disabled={bills === 0 || !isAddressSaved || !selectedTemplate}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print & Download All ({bills})
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setIsLoading(true)
                        const response = await publicApi.get("/api/printingroute/bulkPrinting", {
                          headers: {
                            "tenent-id": tenentId || "",
                          },
                        })

                        if (response.data.bills && response.data.bills.length > 0) {
                          await downloadBulkBillsDataAsPDF(response.data.bills)
                          setBills(0)
                        } else {
                          alert("No bills available for download")
                        }
                      } catch (error: any) {
                        alert(`Error: ${error.message || "Failed to download bills data"}`)
                      } finally {
                        setIsLoading(false)
                      }
                    }}
                    disabled={bills === 0 || !isAddressSaved || !selectedTemplate}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Download All PDFs
                  </button>
                </div>
              </div>
              {bills > 0 && (!isAddressSaved || !selectedTemplate) && (
                <p className="text-sm text-amber-600 mt-1">
                  {!isAddressSaved
                    ? "Please add your address before printing."
                    : "Please select a template before printing."}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handlePrint}
              disabled={!isAddressSaved || !selectedTemplate}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview & Print Sample
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )
    }

    return (
      <OrderPrintPage
        orderData={order}
        fromAddress={previewFromAddress}
        selectedTemplate={selectedTemplate || templates[0]}
        onBack={() => setStep(1)}
      />
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Shipping Label Management</h1>
        {step === 2 && (
          <button className="mt-2 text-blue-600 flex items-center" onClick={() => setStep(1)}>
            <ArrowRight className="w-4 h-4 mr-1 transform rotate-180" />
            Back to settings
          </button>
        )}
      </div>

      {isLoading || loadingTemplates ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        renderStepContent()
      )}
    </div>
  )
}

export default PrintManagement