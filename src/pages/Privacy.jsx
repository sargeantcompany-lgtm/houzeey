import './Legal.css'

export default function Privacy() {
  return (
    <div className="legal-page">
      <div className="container">
        <div className="legal-card">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: March 2026</p>

          <div className="legal-content">
            <p>Houzeey Pty Ltd ("Houzeey") is committed to protecting your privacy. This policy describes how we collect, use, store and disclose your personal information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).</p>

            <h2>1. What we collect</h2>
            <p>We collect information you provide directly:</p>
            <ul>
              <li><strong>Account data:</strong> name, email address, phone number, role (buyer/seller/landlord/tenant/agent)</li>
              <li><strong>Listing data:</strong> property address, photos, description, price</li>
              <li><strong>Identity verification:</strong> photo ID document and selfie (stored encrypted)</li>
              <li><strong>Transaction data:</strong> offer amounts, rental applications, payment records</li>
              <li><strong>Communications:</strong> messages sent through the platform</li>
              <li><strong>Technical data:</strong> IP address, browser type, device information, session logs</li>
            </ul>

            <h2>2. How we use your information</h2>
            <ul>
              <li>Operating and improving the Houzeey platform</li>
              <li>Verifying your identity and preventing fraud</li>
              <li>Facilitating property transactions between users</li>
              <li>Sending transactional emails (booking confirmations, offer updates)</li>
              <li>Sending marketing communications (with your consent — you can opt out at any time)</li>
              <li>Complying with legal obligations</li>
              <li>Resolving disputes and enforcing our Terms</li>
            </ul>

            <h2>3. Who we share it with</h2>
            <p>We do not sell your personal information. We may share it with:</p>
            <ul>
              <li><strong>Other users:</strong> Your name, listing data, and publicly visible profile information is shown to other users as necessary for transactions</li>
              <li><strong>Service providers:</strong> Cloud hosting (Railway), email delivery, payment processing — subject to data processing agreements</li>
              <li><strong>Law enforcement:</strong> Where required by law, court order or to prevent fraud/harm</li>
            </ul>

            <h2>4. Identity document storage</h2>
            <p>ID documents submitted for verification are encrypted at rest, accessed only by authorised staff for verification purposes, and not shared with third parties unless required by law. We retain ID documents for 7 years to comply with AML/CTF obligations, after which they are securely destroyed.</p>

            <h2>5. Data retention</h2>
            <ul>
              <li>Account data: retained while your account is active and for 3 years after closure</li>
              <li>Transaction records: 7 years (tax/legal obligations)</li>
              <li>Messages: 2 years</li>
              <li>Marketing contacts: until you unsubscribe or request deletion</li>
            </ul>

            <h2>6. Your rights</h2>
            <p>Under the Privacy Act, you have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to retention obligations)</li>
              <li>Opt out of marketing communications at any time</li>
              <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC)</li>
            </ul>

            <h2>7. Security</h2>
            <p>We implement industry-standard security including encrypted data transmission (HTTPS), bcrypt password hashing, JWT authentication, and database access controls. No system is 100% secure; if you believe your account has been compromised, contact us immediately.</p>

            <h2>8. Cookies</h2>
            <p>We use session-based authentication stored in localStorage. We do not use third-party advertising cookies.</p>

            <h2>9. Children</h2>
            <p>Houzeey is not intended for users under 18. We do not knowingly collect data from minors.</p>

            <h2>10. Changes</h2>
            <p>We'll notify users of material changes to this policy via email or prominent notice on the platform.</p>

            <h2>11. Contact us</h2>
            <p>Privacy queries: <strong>privacy@houzeey.com</strong><br />
            Houzeey Pty Ltd, Australia</p>
          </div>
        </div>
      </div>
    </div>
  )
}
