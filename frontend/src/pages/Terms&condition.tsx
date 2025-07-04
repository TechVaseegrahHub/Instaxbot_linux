import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function TermsAndConditions() {
  return (
    <div className="container mx-auto p-4 max-w-4xl sm:p-3 sm:px-4">
      <h1 className="text-3xl font-bold mb-6 sm:text-2xl">Terms & Conditions</h1>
      <p className="text-sm text-muted-foreground mb-4">Last updated: December 2, 2024</p>
      
      <div className="prose dark:prose-invert sm:prose-sm">
        <div className="text-base sm:text-sm sm:leading-relaxed">
          <h2 className="text-2xl font-semibold mb-4 sm:text-xl">AGREEMENT TO OUR LEGAL TERMS</h2>
          <p>
            Welcome to InstaXbot, operated by TechVaseegrah ("we", "us", or "our"). By accessing or using our website, located at <a href="https://instaxbot.com" className="text-blue-500">https://instaxbot.com</a> (the "Website"), you agree to comply with these Terms and Conditions ("Terms").
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and TechVaseegrah, the owner of the Website. If you do not agree with any part of these Terms, please discontinue using the Website immediately.
          </p>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="table-of-contents">
              <AccordionTrigger>TABLE OF CONTENTS</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal list-inside">
                  <li>Acceptance of Terms</li>
                  <li>Modifications to Terms</li>
                  <li>Use of the Website</li>
                  <li>Intellectual Property Rights</li>
                  <li>Privacy Policy</li>
                  <li>Prohibited Uses</li>
                  <li>Limitation of Liability</li>
                  <li>Indemnification</li>
                  <li>Governing Law</li>
                  <li>Dispute Resolution</li>
                  <li>Termination</li>
                  <li>Contact Us</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="acceptance-of-terms">
              <AccordionTrigger>1. ACCEPTANCE OF TERMS</AccordionTrigger>
              <AccordionContent>
                <p>
                  By accessing and using the Website, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must refrain from using the Website.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="modifications-to-terms">
              <AccordionTrigger>2. MODIFICATIONS TO TERMS</AccordionTrigger>
              <AccordionContent>
                <p>
                  We reserve the right to modify or replace these Terms at any time. Any changes will be posted on this page with an updated "Last updated" date. Continued use of the Website after such changes constitutes acceptance of the new Terms.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="use-of-website">
              <AccordionTrigger>3. USE OF THE WEBSITE</AccordionTrigger>
              <AccordionContent>
                <p>
                  You may use the Website for lawful purposes only. You are responsible for your use of the Website and must ensure that all information provided by you is accurate and up to date.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="intellectual-property-rights">
              <AccordionTrigger>4. INTELLECTUAL PROPERTY RIGHTS</AccordionTrigger>
              <AccordionContent>
                <p>
                  All content on the Website, including but not limited to text, graphics, logos, images, and software, is owned by or licensed to TechVaseegrah and is protected by copyright and other intellectual property laws. You may not copy, modify, or distribute any content without prior written consent.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="privacy-policy">
              <AccordionTrigger>5. PRIVACY POLICY</AccordionTrigger>
              <AccordionContent>
                <p>
                  Our Privacy Policy governs the collection and use of your information. By using the Website, you consent to the collection and use of your personal information as outlined in our Privacy Policy.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prohibited-uses">
              <AccordionTrigger>6. PROHIBITED USES</AccordionTrigger>
              <AccordionContent>
                <p>
                  You agree not to use the Website for any illegal or unauthorized purposes, including but not limited to, the violation of intellectual property rights, transmission of harmful content, or interference with the operation of the Website.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="limitation-of-liability">
              <AccordionTrigger>7. LIMITATION OF LIABILITY</AccordionTrigger>
              <AccordionContent>
                <p>
                  In no event shall TechVaseegrah be liable for any direct, indirect, incidental, or consequential damages arising from your use or inability to use the Website, even if we have been advised of the possibility of such damages.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="indemnification">
              <AccordionTrigger>8. INDEMNIFICATION</AccordionTrigger>
              <AccordionContent>
                <p>
                  You agree to indemnify and hold harmless TechVaseegrah, its affiliates, employees, and agents from any claims, damages, liabilities, and expenses arising from your use of the Website, violation of these Terms, or infringement of third-party rights.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="governing-law">
              <AccordionTrigger>9. GOVERNING LAW</AccordionTrigger>
              <AccordionContent>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these Terms will be subject to the exclusive jurisdiction of the courts located in Thanjavur, Tamil Nadu, India.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="dispute-resolution">
              <AccordionTrigger>10. DISPUTE RESOLUTION</AccordionTrigger>
              <AccordionContent>
                <p>
                  Any disputes under these Terms shall first be attempted to be resolved through informal negotiations. If the dispute is not resolved within a reasonable period, it shall be resolved through arbitration in Thanjavur, Tamil Nadu, India.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="termination">
              <AccordionTrigger>11. TERMINATION</AccordionTrigger>
              <AccordionContent>
                <p>
                  We may suspend or terminate your access to the Website at our sole discretion, without notice, for any reason, including if we believe you have violated these Terms.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="contact-us">
              <AccordionTrigger>12. CONTACT US</AccordionTrigger>
              <AccordionContent>
                <p>
                  If you have any questions about these Terms, please contact us at:
                </p>
                <address className="not-italic">
                  TechVaseegrah<br />
                  No. 7, Vijayanagar Wahab Nagar, Reddypalayam Road,<br />
                  Srinivasapuram post,<br />
                  Thanjavur, Tamil Nadu 613009<br />
                  India<br />
                  Phone: 8524089733<br />
                  admin@techvaseegrah.com
                </address>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  )
}
