import React, { CSSProperties } from "react";
import { Text } from "@react-email/text";
import { Section } from "@react-email/section";
import { Row } from "@react-email/row";
import { Column } from "@react-email/column";
import { Button } from "@react-email/button";
import { Hr } from "@react-email/hr";
import Layout from "./Layout";
import theme from "./theme";
import { EmailVerificationProps } from "./types";

const EmailVerification: React.FC<EmailVerificationProps> = ({
  name,
  email,
  verificationLink,
  texts,
}) => {
  return (
    <Layout
      copyRight={texts.copyRight}
      supportEmail={texts.supportEmail}
      websiteUrl={texts.websiteUrl}
    >
      {/* Message de bienvenue et création de compte */}
      <Section>
        <Row>
          <Column>
            <Text style={styleGreeting} className="mobile-text-large">
              {texts.greeting} {name} 👋
            </Text>
            <Text style={styleWelcomeMessage} className="mobile-text-medium">
              🎉 Félicitations ! Votre compte a été créé avec succès !
            </Text>
            <Text style={styleMainText} className="mobile-text-medium">
              {texts.instruction}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Bouton de vérification - ACTION PRINCIPALE */}
      <Section style={styleButtonSection} className="mobile-section">
        <Row>
          <Column align="center">
            <Button
              href={verificationLink}
              style={styleButton}
              className="mobile-button"
            >
              ✅ {texts.buttonText}
            </Button>
          </Column>
        </Row>
      </Section>

      {/* ALERTE EXPIRATION - INFORMATION IMPORTANTE */}
      <Section style={styleExpirationSection} className="mobile-section">
        <Row>
          <Column>
            <Text style={styleExpirationInfo} className="mobile-text-medium">
              {texts.expirationInfo}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Informations supplémentaires */}
      <Section>
        <Row>
          <Column>
            <Text style={styleAdditionalInfo} className="mobile-text-small">
              {texts.additionalInfo}
            </Text>
          </Column>
        </Row>
      </Section>

      <Hr style={styleHr} />

      {/* Lien de secours */}
      <Section>
        <Row>
          <Column>
            <Text style={styleSecondaryText} className="mobile-text-small">
              🔗 Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
            </Text>
            <Text style={styleLinkText} className="mobile-text-small">
              {verificationLink}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Aide et support */}
      <Section>
        <Row>
          <Column>
            <Text style={styleHelpText} className="mobile-text-small">
              💬 Vous avez des questions ? Contactez notre équipe support à{" "}
              <a href={`mailto:${texts.supportEmail}`} style={styleEmailLink}>
                {texts.supportEmail}
              </a>
            </Text>
          </Column>
        </Row>
      </Section>
    </Layout>
  );
};

export default EmailVerification;

// Styles optimisés pour mobile
const styleGreeting: CSSProperties = {
  fontSize: "18px", // Réduit de 20px à 18px
  fontWeight: "bold",
  color: "#000000",
  margin: `0 0 12px 0`, // Réduit de 15px à 12px
  lineHeight: "1.3",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleWelcomeMessage: CSSProperties = {
  fontSize: "14px", // Réduit de 16px à 14px
  fontWeight: "bold",
  color: "#065f46",
  margin: `0 0 15px 0`, // Réduit de 20px à 15px
  lineHeight: "1.4",
  textAlign: "center",
  backgroundColor: "#ecfdf5",
  padding: "10px 12px", // Réduit le padding
  borderRadius: "6px", // Réduit de 8px à 6px
  border: "1px solid #059669", // Réduit de 2px à 1px
  fontFamily: "Arial, sans-serif",
};

const styleMainText: CSSProperties = {
  fontSize: "13px", // Réduit de 14px à 13px
  fontWeight: "normal",
  color: "#1f2937",
  margin: `0 0 15px 0`, // Réduit de 20px à 15px
  lineHeight: "1.5",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleExpirationSection: CSSProperties = {
  backgroundColor: "#dc2626", // Rouge vif pour contraste maximum avec texte blanc
  padding: "12px", // Réduit de 15px à 12px
  borderRadius: "6px", // Réduit de 8px à 6px
  margin: "12px 0", // Réduit de 15px à 12px
  border: "1px solid #b91c1c", // Réduit de 2px à 1px
  boxShadow: "0 2px 6px rgba(220, 38, 38, 0.3)", // Ombre rouge
};

const styleButtonSection: CSSProperties = {
  backgroundColor: "#f0fdf4",
  padding: "15px 12px", // Réduit le padding
  borderRadius: "6px", // Réduit de 8px à 6px
  margin: "15px 0", // Réduit de 20px à 15px
  border: "1px solid #22c55e", // Réduit de 2px à 1px
};

const styleButton: CSSProperties = {
  backgroundColor: "#16a34a",
  borderRadius: "6px", // Réduit de 8px à 6px
  color: "#ffffff",
  fontSize: "14px", // Réduit de 16px à 14px
  fontWeight: "600",
  padding: "12px 20px", // Réduit le padding
  textDecoration: "none",
  display: "inline-block",
  margin: "6px 0", // Réduit de 8px à 6px
  boxShadow: "0 3px 6px rgba(22, 163, 74, 0.2)", // Réduit l'ombre
  border: "1px solid #15803d", // Réduit de 2px à 1px
  cursor: "pointer",
  transition: "all 0.3s ease",
  minWidth: "200px", // Réduit de 220px à 200px
  width: "auto", // Adaptable
  maxWidth: "100%", // Responsive par défaut
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  fontFamily: "Arial, sans-serif",
};

const styleAdditionalInfo: CSSProperties = {
  fontSize: "12px", // Réduit de 13px à 12px
  fontWeight: "normal",
  color: "#374151",
  margin: `15px 0 8px 0`, // Réduit les marges
  lineHeight: "1.5",
  textAlign: "center",
  backgroundColor: "#f8fafc",
  padding: "12px", // Réduit de 15px à 12px
  borderRadius: "5px", // Réduit de 6px à 5px
  border: "1px solid #e2e8f0",
  fontFamily: "Arial, sans-serif",
};

const styleExpirationInfo: CSSProperties = {
  fontSize: "13px", // Réduit de 14px à 13px
  fontWeight: "700", // Plus gras pour meilleure visibilité
  color: "#ffffff", // Blanc pour contraste maximum sur fond rouge
  margin: `0`,
  lineHeight: "1.4", // Réduit de 1.5 à 1.4
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
  display: "block",
  textShadow: "1px 1px 3px rgba(0,0,0,0.9)", // Ombre réduite
  letterSpacing: "0.3px", // Réduit l'espacement
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid #d1d5db`, // Réduit de 2px à 1px
  margin: `20px 0`, // Réduit de 25px à 20px
};

const styleSecondaryText: CSSProperties = {
  fontSize: "12px", // Réduit de 13px à 12px
  fontWeight: "500",
  color: "#374151",
  margin: `0 0 6px 0`, // Réduit de 8px à 6px
  lineHeight: "1.4",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleLinkText: CSSProperties = {
  fontSize: "11px", // Réduit de 12px à 11px
  fontWeight: "normal",
  color: "#1f2937",
  margin: `0 0 15px 0`, // Réduit de 20px à 15px
  lineHeight: "1.3",
  wordBreak: "break-all",
  backgroundColor: "#f8f9fa",
  padding: "8px 12px", // Réduit de 10px 15px à 8px 12px
  borderRadius: "5px", // Réduit de 6px à 5px
  border: `1px solid #6b7280`, // Réduit de 2px à 1px
  fontFamily: "monospace",
  textAlign: "center",
};

const styleHelpText: CSSProperties = {
  fontSize: "12px", // Réduit de 13px à 12px
  fontWeight: "normal",
  color: "#374151",
  margin: "0",
  lineHeight: "1.5",
  textAlign: "center",
  backgroundColor: "#f8fafc",
  padding: "12px", // Réduit de 15px à 12px
  borderRadius: "5px", // Réduit de 6px à 5px
  border: "1px solid #e9ecef",
  fontFamily: "Arial, sans-serif",
};

const styleEmailLink: CSSProperties = {
  color: "#1f2937",
  textDecoration: "underline",
  fontWeight: "600",
}; 