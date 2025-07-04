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
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null >(null)
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

  // UNIFIED LAYOUT GENERATOR - Single source of truth for both print and PDF
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

    // Template-specific styling (EXACT same values for print and PDF)
    let styling
    if (template?.id === "2x4" || templateWidth <= 192) {
      styling = {
        baseFontSize: 6,
        titleFontSize: 7,
        smallFontSize: 5,
        lineHeight: 1.0,
        letterSpacing: "normal",
        marginPx: 8,
        marginPt: 6,
        paddingPx: 3,
        paddingPt: 2.25,
        borderWidthPx: 1.5,
        borderWidthPt: 1.125,
        topPaddingAdjustment: 4,
        sectionSpacing: 4,
        barcodeWidth: 1.0,
        barcodeHeight: 30,
      }
    } else if (template?.id === "4x4" || templateWidth <= 384) {
      styling = {
        baseFontSize: 9,
        titleFontSize: 10,
        smallFontSize: 8,
        lineHeight: 1.1,
        letterSpacing: "normal",
        marginPx: 8,
        marginPt: 6,
        paddingPx: 4,
        paddingPt: 3,
        borderWidthPx: 1.5,
        borderWidthPt: 1.125,
        topPaddingAdjustment: 4,
        sectionSpacing: 4,
        barcodeWidth: 1.0,
        barcodeHeight: 35,
      }
    } else {
      styling = {
        baseFontSize: 11,
        titleFontSize: 12,
        smallFontSize: 10,
        lineHeight: 1.2,
        letterSpacing: "normal",
        marginPx: 8,
        marginPt: 6,
        paddingPx: 5,
        paddingPt: 3.75,
        borderWidthPx: 1.5,
        borderWidthPt: 1.125,
        topPaddingAdjustment: 4,
        sectionSpacing: 4,
        barcodeWidth: 1.0,
        barcodeHeight: 40,
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

    // Format products text (EXACT same formatting)
    const formatProductsList = (products: Array<{ productName?: string; name?: string; quantity: number }>): string => {
      if (!products || products.length === 0) {
        return "No products"
      }
    
      // Add debug logging
      console.log("Formatting products:", products)
    
      if (template?.id === "2x4") {
        return products
          .map((product) => {
            const productName = product.productName || product.name
            const truncatedName =
              productName && productName.length > 10 ? productName.substring(0, 9) + "…" : productName
            return `${truncatedName} × ${product.quantity}`
          })
          .join(", ")
      }
    
      return products
        .map((product) => {
          const productName = product.productName || product.name
          return `${productName} × ${product.quantity}`
        })
        .join(", ")
    }
    
    const productText = formatProductsList(formattedOrder.products)
    console.log("Generated product text:", productText)

    // Calculate box dimensions (EXACT same calculations)
    const toAddressBoxHeight = templateHeightPt * 0.28
    const detailBoxHeight = templateHeightPt * 0.22

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
        canvas.width = layout.barcodeWidth * 60
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

  // UNIFIED PRINT CONTENT GENERATOR - Used by both print preview and PDF
  /*const generatePrintContent = (layout: UnifiedLayoutData, barcodeDataUrl = ""): string => {
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
              margin: 0;
              padding: 0;
              width: ${layout.templateWidth}px !important;
              height: ${layout.templateHeight}px !important;
              max-height: ${layout.templateHeight}px !important;
            }
            .container {
              width: 100% !important;
              height: 100% !important;
              page-break-after: always;
              overflow: visible !important;
              box-sizing: border-box;
              padding: ${layout.paddingPx}px !important;
              border: 0 !important;
            }
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
          }

          .header {
            font-size: ${layout.baseFontSize}px;
            font-weight: normal;
            margin-bottom: 3px;
            text-align: left;
          }

          .order-id {
            font-size: ${layout.baseFontSize}px;
            font-weight: normal;
            margin-bottom: 6px;
            text-align: center;
          }

          .barcode-wrapper {
            text-align: center;
            margin: 6px auto 8px auto;
            height: ${layout.barcodeHeight}px;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
          }

          .barcode-img {
            height: ${layout.barcodeHeight}px;
            max-width: 90%;
          }

          .address-box {
            border: ${layout.borderWidthPx}px solid #000;
            padding: ${layout.paddingPx}px;
            margin-bottom: ${layout.sectionSpacing}px;
            min-height: 65px;
          }

          .to-name {
            font-weight: bold;
            font-size: ${layout.baseFontSize}px;
            margin-bottom: 2px;
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
            margin-bottom: ${layout.sectionSpacing}px;
          }

          .detail-box {
            border: ${layout.borderWidthPx}px solid #000;
            padding: ${layout.paddingPx}px;
            min-height: 75px;
          }

          .detail-title {
            font-weight: bold;
            font-size: ${layout.baseFontSize}px;
            margin-bottom: 2px;
          }

          .detail-line {
            font-size: ${layout.smallFontSize}px;
            line-height: ${layout.lineHeight};
            margin-bottom: 1px;
          }

          .product-section {
            border: ${layout.borderWidthPx}px solid #000;
            padding: ${layout.paddingPx}px;
            margin-top: ${layout.sectionSpacing}px;
            min-height: 35px;
          }

          .product-title {
            font-weight: bold;
            font-size: ${layout.baseFontSize}px;
            margin-bottom: 2px;
          }

          .product-list {
            font-size: ${layout.smallFontSize}px;
            line-height: ${layout.lineHeight};
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
  }*/

  // EXACT MATCH PDF GENERATOR - Uses the same layout data as print preview
  const downloadBillDataAsPDF = async (
    billId: string,
    billData?: any,
    templateToUse?: TemplateType
  ) => {
    try {
      let dataToDownload = billData;
  
      if (!dataToDownload && billId) {
        const response = await publicApi.get(`/api/printingroute/print-bill/${billId}`, {
          headers: { "tenent-id": tenentId || "" },
        });
        dataToDownload = response.data;
      }
  
      if (!dataToDownload) {
        console.error("No bill data available for download");
        alert("No bill data available for PDF generation");
        return;
      }
  
      const templateForPdf = templateToUse || selectedTemplate;
      
      if (!templateForPdf) {
        console.error("No template available for PDF generation");
        alert("Please select a template before generating PDF");
        return;
      }
  
      console.log("PDF Generation - Using template:", templateForPdf.name, templateForPdf.id);
  
      const layout = generateUnifiedLayoutData(
        dataToDownload,
        templateForPdf,
        previewFromAddress
      );
  
      const barcodeDataUrl = await generateBarcodeImage(layout.formattedOrder.id, layout);
  
      // ✅ USE EXACT TEMPLATE DIMENSIONS - Don't override!
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [layout.templateWidthPt, layout.templateHeightPt], // Use template dimensions exactly
      });
  
      let yPos = layout.marginPt;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(layout.baseFontSize);
  
      // Header
      doc.text(`Ship Via: ${layout.formattedOrder.shipVia}`, layout.marginPt, yPos);
      yPos += 14;
  
      // Order ID (centered)
      const title = `${layout.fromAddress.name} Order ID: ${layout.formattedOrder.id}`;
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (layout.templateWidthPt - titleWidth) / 2, yPos);
      yPos += 12;
  
      // Barcode
      if (barcodeDataUrl) {
        const barcodeWidth = layout.barcodeWidth * 60; // Match the canvas width from generateBarcodeImage
        const barcodeHeight = layout.barcodeHeight;
        doc.addImage(
          barcodeDataUrl, 
          "PNG", 
          (layout.templateWidthPt - barcodeWidth) / 2, 
          yPos, 
          barcodeWidth, 
          barcodeHeight
        );
        yPos += barcodeHeight + 8;
      } else {
        yPos += layout.barcodeHeight + 8;
      }
  
      // TO Address Box - Use layout-calculated height
      doc.setLineWidth(layout.borderWidthPt);
      doc.rect(layout.marginPt, yPos, layout.templateWidthPt - 2 * layout.marginPt, layout.toAddressBoxHeight);
      
      let addrY = yPos + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(layout.titleFontSize);
      doc.text(`TO ${layout.formattedOrder.toAddress.name}`, layout.marginPt + layout.paddingPt, addrY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(layout.baseFontSize);
      addrY += 12;
      doc.text(layout.formattedOrder.toAddress.street, layout.marginPt + layout.paddingPt, addrY);
      addrY += 10;
      doc.text(layout.formattedOrder.toAddress.city, layout.marginPt + layout.paddingPt, addrY);
      addrY += 10;
      doc.text(`${layout.formattedOrder.toAddress.state} - ${layout.formattedOrder.toAddress.zipCode}`, layout.marginPt + layout.paddingPt, addrY);
      addrY += 10;
      doc.text(`Phone: ${layout.formattedOrder.toAddress.phone}`, layout.marginPt + layout.paddingPt, addrY);
      
      yPos += layout.toAddressBoxHeight + layout.sectionSpacing;
  
      // FROM + ORDER Details (Side-by-side boxes) - Use layout-calculated height
      const boxWidth = (layout.templateWidthPt - 3 * layout.marginPt) / 2;
  
      // FROM Box
      doc.rect(layout.marginPt, yPos, boxWidth, layout.detailBoxHeight);
      let fy = yPos + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(layout.titleFontSize);
      doc.text("From:", layout.marginPt + layout.paddingPt, fy);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(layout.smallFontSize);
      fy += 12;
      doc.text(layout.fromAddress.name, layout.marginPt + layout.paddingPt, fy);
      fy += 10;
      doc.text(layout.fromAddress.street, layout.marginPt + layout.paddingPt, fy);
      fy += 10;
      doc.text(layout.fromAddress.city, layout.marginPt + layout.paddingPt, fy);
      fy += 10;
      doc.text(`${layout.fromAddress.state}-${layout.fromAddress.zipCode}`, layout.marginPt + layout.paddingPt, fy);
      fy += 10;
      doc.text(`Mobile: ${layout.fromAddress.phone}`, layout.marginPt + layout.paddingPt, fy);
  
      // ORDER Box
      const rx = layout.marginPt + boxWidth + layout.marginPt;
      doc.rect(rx, yPos, boxWidth, layout.detailBoxHeight);
      let ry = yPos + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(layout.titleFontSize);
      doc.text("Prepaid Order:", rx + layout.paddingPt, ry);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(layout.smallFontSize);
      ry += 12;
      doc.text(`Date: ${layout.formattedOrder.orderDate}`, rx + layout.paddingPt, ry);
      ry += 10;
      doc.text(`Weight: ${layout.formattedOrder.weight || "0.5 kg"}`, rx + layout.paddingPt, ry);
      ry += 10;
      doc.text(`No. of Items: ${layout.formattedOrder.totalItems}`, rx + layout.paddingPt, ry);
      ry += 10;
      doc.text("Source: Instagram", rx + layout.paddingPt, ry);
      ry += 10;
      doc.text("Packed By: Team", rx + layout.paddingPt, ry);
  
      yPos += layout.detailBoxHeight + layout.sectionSpacing;
  
      // Products Box - Use remaining space in template
      const remainingHeight = layout.templateHeightPt - yPos - layout.marginPt;
      doc.rect(layout.marginPt, yPos, layout.templateWidthPt - 2 * layout.marginPt, remainingHeight);
      
      let py = yPos + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(layout.titleFontSize);
      doc.text("Products:", layout.marginPt + layout.paddingPt, py);
      
      py += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(layout.smallFontSize);
  
      // Split and add products text
      const maxWidth = layout.templateWidthPt - 2 * layout.marginPt - 2 * layout.paddingPt;
      const productLines = doc.splitTextToSize(layout.productText, maxWidth);
      
      productLines.forEach((line: string) => {
        if (py < layout.templateHeightPt - layout.marginPt - 5) {
          doc.text(line, layout.marginPt + layout.paddingPt, py);
          py += 10;
        }
      });
  
      // Save with template-specific filename
      const fileName = `bill_${layout.templateWidth}x${layout.templateHeight}_${layout.formattedOrder.id}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
  
      console.log("PDF generated successfully with template dimensions:", layout.templateWidth, "x", layout.templateHeight);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };
  
  // EXACT MATCH BULK PDF GENERATOR
  const downloadBulkBillsDataAsPDF = async (bills: BillResponseType[]) => {
    try {
      // Ensure there's at least one bill to generate the PDF
      if (bills.length === 0) {
        console.error("No bills available for bulk PDF generation");
        return;
      }
  
      // Use the first bill's layout for the template
      const layout = generateUnifiedLayoutData(bills[0], selectedTemplate, previewFromAddress);
  
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [layout.templateWidthPt, layout.templateHeightPt],
      });
  
      // Loop through each bill and generate a page for it
      for (let index = 0; index < bills.length; index++) {
        const bill = bills[index];
        const layout = generateUnifiedLayoutData(bill, selectedTemplate, previewFromAddress);
        
        let yPos = layout.marginPt;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(layout.baseFontSize);
  
        // Header
        doc.text(`Ship Via: ${layout.formattedOrder.shipVia}`, layout.marginPt, yPos);
        yPos += 14;
  
        // Order ID (centered)
        const title = `${layout.fromAddress.name} Order ID: ${layout.formattedOrder.id}`;
        const titleWidth = doc.getTextWidth(title);
        doc.text(title, (layout.templateWidthPt - titleWidth) / 2, yPos);
        yPos += 12;
  
        // Barcode
        const barcodeDataUrl = await generateBarcodeImage(layout.formattedOrder.id, layout);
        if (barcodeDataUrl) {
          const barcodeWidth = layout.barcodeWidth * 60; // Match the canvas width from generateBarcodeImage
          const barcodeHeight = layout.barcodeHeight;
          doc.addImage(
            barcodeDataUrl, 
            "PNG", 
            (layout.templateWidthPt - barcodeWidth) / 2, 
            yPos, 
            barcodeWidth, 
            barcodeHeight
          );
          yPos += barcodeHeight + 8;
        } else {
          yPos += layout.barcodeHeight + 8;
        }
  
        // TO Address Box - Reduced height to minimize blank space
        const reducedToAddressBoxHeight = layout.toAddressBoxHeight - 12; // Reduce by 12pt for tighter fit
        doc.setLineWidth(layout.borderWidthPt);
        doc.rect(layout.marginPt, yPos, layout.templateWidthPt - 2 * layout.marginPt, reducedToAddressBoxHeight);
        
        let addrY = yPos + 10; // Reduced from 12 to 10 for tighter top spacing
        doc.setFont("helvetica", "bold");
        doc.setFontSize(layout.titleFontSize);
        doc.text(`TO ${layout.formattedOrder.toAddress.name}`, layout.marginPt + layout.paddingPt, addrY);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(layout.baseFontSize);
        addrY += 10; // Reduced from 12 to 10
        doc.text(layout.formattedOrder.toAddress.street, layout.marginPt + layout.paddingPt, addrY);
        addrY += 9; // Reduced from 10 to 9
        doc.text(layout.formattedOrder.toAddress.city, layout.marginPt + layout.paddingPt, addrY);
        addrY += 9; // Reduced from 10 to 9
        doc.text(`${layout.formattedOrder.toAddress.state} - ${layout.formattedOrder.toAddress.zipCode}`, layout.marginPt + layout.paddingPt, addrY);
        addrY += 9; // Reduced from 10 to 9
        doc.text(`Phone: ${layout.formattedOrder.toAddress.phone}`, layout.marginPt + layout.paddingPt, addrY);
        
        yPos += reducedToAddressBoxHeight + layout.sectionSpacing;
  
        // FROM + ORDER Details (Side-by-side boxes) - Use layout-calculated height
        const boxWidth = (layout.templateWidthPt - 3 * layout.marginPt) / 2;
  
        // FROM Box
        doc.rect(layout.marginPt, yPos, boxWidth, layout.detailBoxHeight);
        let fy = yPos + 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(layout.titleFontSize);
        doc.text("From:", layout.marginPt + layout.paddingPt, fy);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(layout.smallFontSize);
        fy += 12;
        doc.text(layout.fromAddress.name, layout.marginPt + layout.paddingPt, fy);
        fy += 10;
        doc.text(layout.fromAddress.street, layout.marginPt + layout.paddingPt, fy);
        fy += 10;
        doc.text(layout.fromAddress.city, layout.marginPt + layout.paddingPt, fy);
        fy += 10;
        doc.text(`${layout.fromAddress.state}-${layout.fromAddress.zipCode}`, layout.marginPt + layout.paddingPt, fy);
        fy += 10;
        doc.text(`Mobile: ${layout.fromAddress.phone}`, layout.marginPt + layout.paddingPt, fy);
  
        // ORDER Box
        const rx = layout.marginPt + boxWidth + layout.marginPt;
        doc.rect(rx, yPos, boxWidth, layout.detailBoxHeight);
        let ry = yPos + 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(layout.titleFontSize);
        doc.text("Prepaid Order:", rx + layout.paddingPt, ry);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(layout.smallFontSize);
        ry += 12;
        doc.text(`Date: ${layout.formattedOrder.orderDate}`, rx + layout.paddingPt, ry);
        ry += 10;
        doc.text(`Weight: ${layout.formattedOrder.weight || "0.5 kg"}`, rx + layout.paddingPt, ry);
        ry += 10;
        doc.text(`No. of Items: ${layout.formattedOrder.totalItems}`, rx + layout.paddingPt, ry);
        ry += 10;
        doc.text("Source: Instagram", rx + layout.paddingPt, ry);
        ry += 10;
        doc.text("Packed By: Team", rx + layout.paddingPt, ry);
  
        yPos += layout.detailBoxHeight + layout.sectionSpacing + 6; // Added 6pt extra space for better separation
  
        // Products Box - Adjusted to account for the space changes above
        const remainingHeight = layout.templateHeightPt - yPos - layout.marginPt + 6; // Compensate for the space we added
        doc.rect(layout.marginPt, yPos, layout.templateWidthPt - 2 * layout.marginPt, remainingHeight);
        
        let py = yPos + 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(layout.titleFontSize);
        doc.text("Products:", layout.marginPt + layout.paddingPt, py);
        
        py += 12;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(layout.smallFontSize);
  
        // Split and add products text
        const maxWidth = layout.templateWidthPt - 2 * layout.marginPt - 2 * layout.paddingPt;
        const productLines = doc.splitTextToSize(layout.productText, maxWidth);
        
        productLines.forEach((line: string) => {
          if (py < layout.templateHeightPt - layout.marginPt - 5) {
            doc.text(line, layout.marginPt + layout.paddingPt, py);
            py += 10;
          }
        });
  
        // Add new page if not the last bill
        if (index < bills.length - 1) {
          doc.addPage();
        }
      }
  
      // Save with template-specific filename
      const fileName = `bulk_bills_${layout.templateWidth}x${layout.templateHeight}_${selectedTemplate?.name || "default"}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
  
      console.log("Bulk PDF generated successfully with template dimensions:", layout.templateWidth, "x", layout.templateHeight);
    } catch (error) {
      console.error("Error downloading bulk shipping labels as PDF:", error);
      alert("Error generating bulk PDF. Please try again.");
    }
  };

  const handlePrintBill = async (billId: string) => {
    if (!billId) {
      alert('Please enter a bill ID');
      return;
    }
    if (!selectedTemplate) {
      alert("Please select a template before printing")
      return
    }
    try {
      setIsLoading(true);
  
      const response = await publicApi.get(`/api/printingroute/print-bill/${billId}`, {
        headers: {
          'tenent-id': tenentId || ''
        }
      });
  
      if (!response.data) {
        throw new Error('No data returned from server');
      }
  
      const responseOrder: BillResponseType = response.data;
      
      // Format order data - Fix the missing properties issue by adding all required fields
      const formattedOrder: OrderType = {
        id: responseOrder.bill_id,
        name: responseOrder.customer_details.name,
        toAddress: {
          name: responseOrder.customer_details.name,
          street: responseOrder.customer_details.street,
          city: responseOrder.customer_details.district,
          state: responseOrder.customer_details.state,
          zipCode: responseOrder.customer_details.pincode,
          phone: responseOrder.customer_details.phone
        },
        isPrepaid: true, // Default to true
        orderDate: `${responseOrder.bill_details.date}, ${responseOrder.bill_details.time}`,
        shipVia: responseOrder.shipping_details?.method_name || 'Standard Shipping',
        products: responseOrder.product_details.map(product => ({
          name: product.productName,
          quantity: product.quantity
        })),
        totalItems: responseOrder.product_details.reduce((total, product) => total + product.quantity, 0),
        packedBy: 'Team',
        weight: responseOrder.shipping_details?.weight || '0.5 kg'
      };
  
      setCurrentOrder(formattedOrder);
      
      // Add to print history
      const updatedHistory = [billId, ...printHistory.filter(id => id !== billId)].slice(0, 10);
      setPrintHistory(updatedHistory);
      localStorage.setItem('printHistory', JSON.stringify(updatedHistory));
      
      // Calculate dimensions in inches (96 DPI standard)
      const templateWidth = (selectedTemplate?.width || 384) / 96;
      const templateHeight = (selectedTemplate?.height || 384) / 96;
      
      // Determine font sizes based on template dimensions
      const getFontSizes = (template: TemplateType | null) => {
        // Small template (2x4)
        if (template?.id === '2x4' || (template?.width && template.width <= 192)) {
          return {
            baseFontSize: 5, // Further reduced
            titleFontSize: 6, // Further reduced
            smallFontSize: 4, // Further reduced
            letterSpacing: '-0.4px', // Increased letter spacing reduction
            lineHeight: 0.8, // Further reduced
            padding: '1px', // Reduced padding
            borderWidth: '0.5px'
          };
        }
        // Medium template (4x4)
        else if (template?.id === '4x4' || (template?.width && template.width <= 384)) {
          return {
            baseFontSize: 11,
            titleFontSize: 12,
            smallFontSize: 10,
            letterSpacing: 'normal',
            lineHeight: 1.2,
            padding: '4px',
            borderWidth: '1px'
          };
        }
        // Larger templates
        else {
          return {
            baseFontSize: 14,
            titleFontSize: 16, 
            smallFontSize: 12,
            letterSpacing: 'normal',
            lineHeight: 1.3,
            padding: '6px',
            borderWidth: '1px'
          };
        }
      };
      
      // Adjust barcode size based on template
      const barcodeWidth = selectedTemplate?.id === '2x4' ? 0.8 : 1.2;
      const barcodeHeight = selectedTemplate?.id === '2x4' ? 25 : 40;
      
      // Get font sizes based on selected template
      const fontSizes = getFontSizes(selectedTemplate);
      
      // Format product list with adaptive font sizes
      const formatProductsList = (products: Array<{ productName?: string; name?: string; quantity: number }>): string => {
        if (!products || products.length === 0) {
          return "No products";
        }
        
        // Calculate how many products we have to display
        const totalProducts = products.length;
        
        // Dynamically reduce font size for longer product lists
        let fontSize = fontSizes.smallFontSize;
        let lineHeight = fontSizes.lineHeight;
        
        if (totalProducts > 6) {
          fontSize = Math.max(fontSize - 1, 3); // Reduce font size but not below 3px
          lineHeight = Math.max(lineHeight - 0.1, 0.7); // Reduce line height proportionally
        }
        
        if (totalProducts > 10) {
          fontSize = Math.max(fontSize - 1, 2); // Further reduce for very long lists
          lineHeight = Math.max(lineHeight - 0.1, 0.6);
        }
        
        // For small templates (2x4), always use compact format
        if (selectedTemplate?.id === '2x4') {
          return products.map(product => {
            const productName = product.productName || product.name;
            // Truncate product names for small templates
            const truncatedName = productName && productName.length > 10 
              ? productName.substring(0, 9) + '…' 
              : productName;
            return `${truncatedName} × ${product.quantity}`;
          }).join(', ');
        }
        
        // For larger templates, format as a vertical list with optimized spacing
        return products.map(product => {
          const productName = product.productName || product.name;
          return `${productName} × ${product.quantity}`;
        }).join(', ');
      };
      
      // Instead of navigating to print step, directly print
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Unable to open print window. Please disable your pop-up blocker and try again.');
        return;
      }
    
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Print Label - ${billId}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"></script>
            <style>
              @media print {
                @page {
                  size: ${templateWidth}in ${templateHeight}in;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                  width: ${selectedTemplate?.width || 384}px !important;
                  height: ${selectedTemplate?.height || 384}px !important;
                  max-height: ${selectedTemplate?.height || 384}px !important;
                }
                .container {
                  width: 100% !important;
                  height: 100% !important;
                  page-break-after: always;
                  overflow: visible !important;
                  box-sizing: border-box;
                  padding: ${fontSizes.padding} !important;
                  padding-top: 15px !important; /* Increased padding at the top */
                  padding-left: 12px !important; /* Added padding for left */
                  padding-right: 12px !important; /* Added padding for right */
                  padding-bottom: 12px !important; /* Added padding for bottom */
                  border: 0 !important;
                }
              }
              
              html, body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                font-size: ${fontSizes.baseFontSize}px;
                line-height: ${fontSizes.lineHeight};
                font-weight: 500;
                letter-spacing: ${fontSizes.letterSpacing};
              }
              
              .container {
                width: ${selectedTemplate?.width || 384}px;
                height: ${selectedTemplate?.height || 384}px;
                margin: 0 auto;
                padding: ${fontSizes.padding};
                padding-top: 15px; /* Added more padding at the top of the container */
                padding-left: 12px; /* Added padding for left */
                padding-right: 12px; /* Added padding for right */
                padding-bottom: 12px; /* Added padding for bottom */
                box-sizing: border-box;
                position: relative;
                border: 0;
              }
              
              .header {
                font-size: ${fontSizes.titleFontSize}px;
                font-weight: bold;
                margin-top: 10px; /* Add space before the Ship Via header */
                margin-bottom: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              
              .order-id {
                font-size: ${fontSizes.titleFontSize}px;
                font-weight: bold;
                margin-bottom: 4px;
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              
              .barcode-wrapper {
                text-align: center;
                margin: 8px auto; /* Changed: added auto for horizontal centering */
                height: ${barcodeHeight}px;
                display: flex; /* Added: flexbox for better centering */
                justify-content: center; /* Added: center horizontally */
                align-items: center; /* Added: center vertically */
                width: 90%; /* Added: set width to limit barcode width */
              }
              
              .barcode-img {
                max-height: 100%;
                max-width: 100%; /* Added: ensure barcode fits container */
              }
              
              .address-box {
                border: ${fontSizes.borderWidth} solid #000;
                padding: ${fontSizes.padding};
                margin-bottom: 4px;
                min-height: 80px;
                overflow: visible;
              }
              
              .to-name {
                font-weight: bold;
                font-size: ${fontSizes.titleFontSize}px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              
              .address-line {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: ${fontSizes.lineHeight};
                font-size: ${fontSizes.baseFontSize}px;
              }
              
              .details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 4px;
                margin-bottom: 4px;
              }
              
              .detail-box {
                border: ${fontSizes.borderWidth} solid #000;
                padding: ${fontSizes.padding};
                min-height: 70px;
              }
              
              .detail-title {
                font-weight: bold;
                font-size: ${fontSizes.titleFontSize}px;
              }
              
              .product-section {
                border: ${fontSizes.borderWidth} solid #000;
                padding: ${fontSizes.padding};
                padding-top: 4px; /* Reduced from 10px to save space */
                margin-top: 6px; /* Reduced from 8px to save space */
                min-height: ${60 - (formattedOrder.products.length > 6 ? 10 : 0)}px;
                overflow: hidden; /* Changed from visible to prevent overflow */
              }
  
              .product-title {
                font-weight: bold;
                font-size: ${fontSizes.titleFontSize}px;
                margin-bottom: 1px; /* Reduced from 2px to save space */
              }
  
              .product-list {
                white-space: normal;
                word-wrap: break-word;
                line-height: ${formattedOrder.products.length > 6 ? Math.max(fontSizes.lineHeight - 0.2, 0.7) : fontSizes.lineHeight};
                font-size: ${formattedOrder.products.length > 6 ? Math.max(fontSizes.smallFontSize - 1, 3) : fontSizes.smallFontSize}px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                Ship Via: ${formattedOrder.shipVia}
              </div>
              
              <div class="order-id">
                ${previewFromAddress.name} Order ID: ${formattedOrder.id}
              </div>
              
              <div class="barcode-wrapper">
                <!-- Use an SVG element with an ID that JsBarcode can target -->
                <svg id="barcode-${formattedOrder.id}" class="barcode-img"></svg>
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
                  <div class="address-line">${previewFromAddress.name}</div>
                  <div class="address-line">${previewFromAddress.street}</div>
                  <div class="address-line">${previewFromAddress.city}</div>
                  <div class="address-line">${previewFromAddress.state}-${previewFromAddress.zipCode}</div>
                  <div class="address-line">Mobile: ${previewFromAddress.phone}</div>
                </div>
                
                <div class="detail-box">
                  <div class="detail-title">
                    Prepaid Order:
                  </div>
                  <div class="address-line">Date: ${formattedOrder.orderDate}</div>
                  <div class="address-line">Weight: </div>
                  <div class="address-line">No. of Items: ${formattedOrder.totalItems}</div>
                  <div class="address-line">Source: Instagram</div>
                  <div class="address-line">Packed By: </div>
                </div>
              </div>
              
              <div class="product-section">
                <div class="product-title">Products:</div>
                <div class="product-list">
                  ${formatProductsList(formattedOrder.products)}
                </div>
              </div>
            </div>
            <script>
              window.onload = function() {
                // Generate the barcode after the document loads
                JsBarcode("#barcode-${formattedOrder.id}", "${formattedOrder.id}", { 
                  format: "CODE128", 
                  width: ${barcodeWidth},
                  height: ${barcodeHeight},
                  displayValue: false,
                  margin: 0
                });
                
                // Wait a moment to ensure barcode renders before printing
                setTimeout(() => {
                  window.print();
                  setTimeout(() => window.close(), 500);
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        downloadBillDataAsPDF(billId, responseOrder, selectedTemplate)
      }, 1000)
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to print bill. Please try again.'}`);
      console.error('Print error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkPrint = async () => {
    if (!isAddressSaved) {
      alert('Please enter your shipping from address before printing in bulk');
      return;
    }

    try {
      setIsLoading(true);
      const response = await publicApi.get('/api/printingroute/bulkPrinting', {
        headers: {
          'tenent-id': tenentId || ''
        }
      });

      if (!response.data.bills || response.data.bills.length === 0) {
        alert('No bills available for printing');
        return;
      }

      const printContent = generateBulkPrintContent(response.data.bills);
      const printWindow = window.open('', '_blank');

      if (!printWindow) {
        alert('Unable to open print window. Please disable your pop-up blocker and try again.');
        return;
      }

      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();

      printWindow.onload = function () {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
            setBills(0);
          } catch (error) {
            console.error("Print error:", error);
            alert("There was an error while trying to print. Please try again.");
          } finally {
            printWindow.close();
            setTimeout(() => {
              downloadBulkBillsDataAsPDF(response.data.bills)
            }, 1000)
          }
        }, 500);
      };


    } catch (error: any) {
      alert(`Error: ${error.message || 'Error during printing. Please try again.'}`);
      console.error('Bulk print error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  // UNIFIED BULK PRINT CONTENT GENERATOR
  const generateBulkPrintContent = (bills: BillResponseType[]) => {
    // Get the dimensions from the selected template
    const templateWidth = (selectedTemplate?.width || 384) / 96;
    const templateHeight = (selectedTemplate?.height || 384) / 96;
    
    // Determine font sizes based on template dimensions - using the same logic as handlePrintBill
    const getFontSizes = (template: TemplateType | null) => {
      // Small template (2x4)
      if (template?.id === '2x4' || (template?.width && template.width <= 192)) {
        return {
          baseFontSize: 5, // Further reduced
          titleFontSize: 6, // Further reduced
          smallFontSize: 4, // Further reduced
          letterSpacing: '-0.4px', // Increased letter spacing reduction
          lineHeight: 0.8, // Further reduced
          padding: '1px', // Reduced padding
          borderWidth: '0.5px'
        };
      }
      // Medium template (4x4)
      else if (template?.id === '4x4' || (template?.width && template.width <= 384)) {
        return {
          baseFontSize: 11,
          titleFontSize: 12,
          smallFontSize: 10,
          letterSpacing: 'normal',
          lineHeight: 1.2,
          padding: '4px',
          borderWidth: '1px'
        };
      }
      // Larger templates
      else {
        return {
          baseFontSize: 14,
          titleFontSize: 16, 
          smallFontSize: 12,
          letterSpacing: 'normal',
          lineHeight: 1.3,
          padding: '6px',
          borderWidth: '1px'
        };
      }
    };
  
    // Get font sizes based on selected template
    const fontSizes = getFontSizes(selectedTemplate);
    
    // Adjust barcode size based on template
    const barcodeWidth = selectedTemplate?.id === '2x4' ? 0.8 : 1.2;
    const barcodeHeight = selectedTemplate?.id === '2x4' ? 25 : 40;
    
    const styles = `
      <style>
        @media print {
          @page {
            size: ${templateWidth}in ${templateHeight}in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            width: ${selectedTemplate?.width || 384}px !important;
            height: ${selectedTemplate?.height || 384}px !important;
            max-height: ${selectedTemplate?.height || 384}px !important;
          }
          .page-container {
            width: 100% !important;
            height: 100% !important;
            page-break-after: always;
            overflow: visible !important;
            box-sizing: border-box;
          }
          .container {
            width: 100% !important;
            height: 100% !important;
            page-break-after: always;
            overflow: visible !important;
            box-sizing: border-box;
            padding: ${fontSizes.padding} !important;
            padding-top: 15px !important; /* Increased padding at the top */
            padding-left: 12px !important; /* Added padding for left */
            padding-right: 12px !important; /* Added padding for right */
            padding-bottom: 12px !important; /* Added padding for bottom */
            border: 0 !important;
          }
        }
        
        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          font-size: ${fontSizes.baseFontSize}px;
          line-height: ${fontSizes.lineHeight};
          font-weight: 500;
          letter-spacing: ${fontSizes.letterSpacing};
        }
        
        .page-container {
          width: ${selectedTemplate?.width || 384}px;
          height: ${selectedTemplate?.height || 384}px;
          page-break-after: always;
          margin: 0 auto;
          box-sizing: border-box;
          position: relative;
        }
        
        .container {
          width: ${selectedTemplate?.width || 384}px;
          height: ${selectedTemplate?.height || 384}px;
          margin: 0 auto;
          padding: ${fontSizes.padding};
          padding-top: 15px; /* Added more padding at the top of the container */
          padding-left: 12px; /* Added padding for left */
          padding-right: 12px; /* Added padding for right */
          padding-bottom: 12px; /* Added padding for bottom */
          box-sizing: border-box;
          position: relative;
          border: 0;
        }
        
        .header {
          font-size: ${fontSizes.titleFontSize}px;
          font-weight: bold;
          margin-top: 10px; /* Add space before the Ship Via header */
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .order-id {
          font-size: ${fontSizes.titleFontSize}px;
          font-weight: bold;
          margin-bottom: 4px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .barcode-wrapper {
          text-align: center;
          margin: 8px auto; /* Changed: added auto for horizontal centering */
          height: ${barcodeHeight}px;
          display: flex; /* Added: flexbox for better centering */
          justify-content: center; /* Added: center horizontally */
          align-items: center; /* Added: center vertically */
          width: 90%; /* Added: set width to limit barcode width */
        }
        
        .barcode-img {
          max-height: 100%;
          max-width: 100%; /* Added: ensure barcode fits container */
        }
        
        .address-box {
          border: ${fontSizes.borderWidth} solid #000;
          padding: ${fontSizes.padding};
          margin-bottom: 4px;
          min-height: 80px;
          overflow: visible;
        }
        
        .to-name {
          font-weight: bold;
          font-size: ${fontSizes.titleFontSize}px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .address-line {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: ${fontSizes.lineHeight};
          font-size: ${fontSizes.baseFontSize}px;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin-bottom: 4px;
        }
        
        .detail-box {
          border: ${fontSizes.borderWidth} solid #000;
          padding: ${fontSizes.padding};
          min-height: 70px;
        }
        
        .detail-title {
          font-weight: bold;
          font-size: ${fontSizes.titleFontSize}px;
        }
        
        .product-section {
          border: ${fontSizes.borderWidth} solid #000;
          padding: ${fontSizes.padding};
          padding-top: 4px; /* Reduced from 10px to save space */
          margin-top: 6px; /* Reduced from 8px to save space */
          min-height: 60px;
          overflow: hidden; /* Changed from visible to prevent overflow */
        }
  
        .product-title {
          font-weight: bold;
          font-size: ${fontSizes.titleFontSize}px;
          margin-bottom: 1px; /* Reduced from 2px to save space */
        }
  
        .product-list {
          white-space: normal;
          word-wrap: break-word;
        }
      </style>
    `;
    
    // Format product list with adaptive font sizes
    const formatProductsList = (products: Array<{ productName?: string; name?: string; quantity: number }>): string => {
      if (!products || products.length === 0) {
        return "No products";
      }
      
      // Calculate how many products we have to display
      const totalProducts = products.length;
      
      // Determine the best way to display based on product count
      let fontSize = fontSizes.smallFontSize;
      let lineHeight = fontSizes.lineHeight;
      
      // Dynamically reduce font size for longer product lists
      if (totalProducts > 6) {
        fontSize = Math.max(fontSize - 1, 3); // Reduce font size but not below 3px
        lineHeight = Math.max(lineHeight - 0.1, 0.7); // Reduce line height proportionally
      }
      
      if (totalProducts > 10) {
        fontSize = Math.max(fontSize - 1, 2); // Further reduce for very long lists
        lineHeight = Math.max(lineHeight - 0.1, 0.6);
      }
      
      // For small templates (2x4), always use compact format
      if (selectedTemplate?.id === '2x4') {
        return products.map(product => {
          const productName = product.productName || product.name;
          // Truncate product names for small templates
          const truncatedName = productName && productName.length > 10 
            ? productName.substring(0, 9) + '…' 
            : productName;
          return `${truncatedName} × ${product.quantity}`;
        }).join(', ');
      }
      
      // For larger templates, format as a vertical list with optimized spacing
      return products.map(product => {
        const productName = product.productName || product.name;
        return `${productName} × ${product.quantity}`;
      }).join(', ');
    };
    
    // Create a layout template based on the selected template size
    const generateLabelHTML = (bill: BillResponseType) => {
      const totalItems = bill.product_details.reduce((total, product) => total + product.quantity, 0);
      const productCount = bill.product_details.length;
      
      const fromAddress = {
        name: bill.organisation_details.Name || previewFromAddress.name,
        street: bill.organisation_details.street || previewFromAddress.street,
        city: bill.organisation_details.district || previewFromAddress.city,
        state: bill.organisation_details.state || previewFromAddress.state,
        zipCode: bill.organisation_details.pincode || previewFromAddress.zipCode,
        phone: bill.organisation_details.phone || previewFromAddress.phone
      };
      
      return `
        <div class="page-container">
          <div class="container">
            <div class="header">
              Ship Via: ${bill.shipping_details?.method_name || 'Standard Shipping'}
            </div>
            
            <div class="order-id">
              ${fromAddress.name} Order ID: ${bill.bill_details.bill_no}
            </div>
            
            <div class="barcode-wrapper">
              <!-- Use an SVG element with a unique ID -->
              <svg id="barcode-${bill.bill_id}" class="barcode-img"></svg>
            </div>
            
            <div class="address-box">
              <div class="to-name">TO ${bill.customer_details.name}</div>
              <div class="address-line">${(bill.customer_details.flat_no ? bill.customer_details.flat_no + ', ' : '') + bill.customer_details.street}</div>
              <div class="address-line">${bill.customer_details.district}</div>
              <div class="address-line">${bill.customer_details.state} ${bill.customer_details.pincode}</div>
              <div class="address-line">${bill.customer_details.phone}</div>
            </div>
            
            <div class="details-grid">
              <div class="detail-box">
                <div class="detail-title">From:</div>
                <div class="address-line">${fromAddress.name}</div>
                <div class="address-line">${fromAddress.street}</div>
                <div class="address-line">${fromAddress.city}</div>
                <div class="address-line">${fromAddress.state}-${fromAddress.zipCode}</div>
                <div class="address-line">Mobile: ${fromAddress.phone}</div>
              </div>
              
              <div class="detail-box">
                <div class="detail-title">
                  Prepaid Order:
                </div>
                <div class="address-line">Date: ${bill.bill_details.date}, ${bill.bill_details.time}</div>
                <div class="address-line">Weight: </div>
                <div class="address-line">No. of Items: ${totalItems}</div>
                <div class="address-line">Source: Instagram</div>
                <div class="address-line">Packed By: </div>
              </div>
            </div>
            
            <div class="product-section" style="padding-top: 4px; min-height: ${60 - (productCount > 6 ? 10 : 0)}px;">
              <div class="product-title" style="margin-bottom: 1px;">Products:</div>
              <div class="product-list" style="line-height: ${productCount > 6 ? Math.max(fontSizes.lineHeight - 0.2, 0.7) : fontSizes.lineHeight}; font-size: ${productCount > 6 ? Math.max(fontSizes.smallFontSize - 1, 3) : fontSizes.smallFontSize}px;">
                ${formatProductsList(bill.product_details)}
              </div>
            </div>
          </div>
        </div>
      `;
    };
    
    // Generate HTML for all bills
    const billsHTML = bills.map(bill => generateLabelHTML(bill)).join('');
    
    // Create barcode initialization code for each bill
    const barcodeInitScript = bills.map(bill => {
      return `
        JsBarcode("#barcode-${bill.bill_id}", "${bill.bill_details.bill_no}", { 
          format: "CODE128", 
          width: ${barcodeWidth},
          height: ${barcodeHeight},
          displayValue: false,
          margin: 0
        });
      `;
    }).join('\n');
  
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
            // Wait for document to fully load before generating barcodes
            document.addEventListener('DOMContentLoaded', function() {
              try {
                // Generate all barcodes
                ${barcodeInitScript}
                
                // Wait for barcodes to render before printing
                setTimeout(function() {
                  window.print();
                  setTimeout(() => window.close(), 500);
                }, 1000); // Increased timeout to ensure barcodes render
              } catch(error) {
                console.error('Error generating barcodes:', error);
                alert('There was an error generating the barcodes. Please try again.');
              }
            });
          </script>
        </body>
      </html>
    `;
  };

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