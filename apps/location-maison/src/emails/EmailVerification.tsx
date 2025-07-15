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
            <Text style={styleGreeting}>
              {texts.greeting} {name} 👋
            </Text>
            <Text style={styleWelcomeMessage}>
              🎉 Félicitations ! Votre compte a été créé avec succès !
            </Text>
            <Text style={styleMainText}>
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
            <Text style={styleExpirationInfo}>
              {texts.expirationInfo}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Informations supplémentaires */}
      <Section>
        <Row>
          <Column>
            <Text style={styleAdditionalInfo}>
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
            <Text style={styleSecondaryText}>
              🔗 Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
            </Text>
            <Text style={styleLinkText}>
              {verificationLink}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Aide et support */}
      <Section>
        <Row>
          <Column>
            <Text style={styleHelpText}>
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

// Styles corrigés avec tailles réduites
const styleGreeting: CSSProperties = {
  fontSize: "20px", // Réduit de 28px à 20px
  fontWeight: "bold",
  color: "#000000",
  margin: `0 0 15px 0`,
  lineHeight: "1.3",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleWelcomeMessage: CSSProperties = {
  fontSize: "16px", // Réduit de 22px à 16px
  fontWeight: "bold",
  color: "#065f46",
  margin: `0 0 20px 0`,
  lineHeight: "1.4",
  textAlign: "center",
  backgroundColor: "#ecfdf5",
  padding: "12px 16px", // Réduit le padding
  borderRadius: "8px", // Réduit de 12px à 8px
  border: "2px solid #059669",
  fontFamily: "Arial, sans-serif",
};

const styleMainText: CSSProperties = {
  fontSize: "14px", // Réduit de 18px à 14px
  fontWeight: "normal",
  color: "#1f2937",
  margin: `0 0 20px 0`,
  lineHeight: "1.5",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleExpirationSection: CSSProperties = {
  backgroundColor: "#dc2626", // Rouge vif pour contraste maximum avec texte blanc
  padding: "15px",
  borderRadius: "8px",
  margin: "15px 0",
  border: "2px solid #b91c1c", // Bordure rouge plus foncée
  boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)", // Ombre rouge
};

const styleButtonSection: CSSProperties = {
  backgroundColor: "#f0fdf4",
  padding: "20px 15px", // Réduit le padding
  borderRadius: "8px",
  margin: "20px 0",
  border: "2px solid #22c55e",
};

const styleButton: CSSProperties = {
  backgroundColor: "#16a34a",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "14px 28px", // Légèrement plus grand pour mobile
  textDecoration: "none",
  display: "inline-block",
  margin: "8px 0",
  boxShadow: "0 4px 8px rgba(22, 163, 74, 0.2)",
  border: "2px solid #15803d",
  cursor: "pointer",
  transition: "all 0.3s ease",
  minWidth: "220px", // Légèrement plus large pour toucher mobile
  width: "auto", // Adaptable
  maxWidth: "90%", // Responsive par défaut
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  fontFamily: "Arial, sans-serif",
};

const styleAdditionalInfo: CSSProperties = {
  fontSize: "13px", // Réduit de 16px à 13px
  fontWeight: "normal",
  color: "#374151",
  margin: `20px 0 10px 0`, // Réduit les marges
  lineHeight: "1.5",
  textAlign: "center",
  backgroundColor: "#f8fafc",
  padding: "15px", // Réduit de 20px à 15px
  borderRadius: "6px", // Réduit de 8px à 6px
  border: "1px solid #e2e8f0",
  fontFamily: "Arial, sans-serif",
};

const styleExpirationInfo: CSSProperties = {
  fontSize: "14px",
  fontWeight: "700", // Plus gras pour meilleure visibilité
  color: "#ffffff", // Blanc pour contraste maximum sur fond rouge
  margin: `0`,
  lineHeight: "1.5", // Plus d'espace pour lisibilité
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
  display: "block",
  textShadow: "2px 2px 4px rgba(0,0,0,0.9)", // Ombre plus prononcée
  letterSpacing: "0.5px", // Espacement pour clarté
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid #d1d5db`, // Réduit de 2px à 1px
  margin: `25px 0`, // Réduit de 40px à 25px
};

const styleSecondaryText: CSSProperties = {
  fontSize: "13px", // Réduit de 15px à 13px
  fontWeight: "500",
  color: "#374151",
  margin: `0 0 8px 0`, // Réduit de 10px à 8px
  lineHeight: "1.4",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleLinkText: CSSProperties = {
  fontSize: "12px", // Réduit de 14px à 12px
  fontWeight: "normal",
  color: "#1f2937",
  margin: `0 0 20px 0`, // Réduit de 30px à 20px
  lineHeight: "1.3",
  wordBreak: "break-all",
  backgroundColor: "#f8f9fa",
  padding: "10px 15px", // Réduit de 15px 20px à 10px 15px
  borderRadius: "6px", // Réduit de 8px à 6px
  border: `1px solid #6b7280`, // Réduit de 2px à 1px
  fontFamily: "monospace",
  textAlign: "center",
};

const styleHelpText: CSSProperties = {
  fontSize: "13px", // Réduit de 15px à 13px
  fontWeight: "normal",
  color: "#374151",
  margin: "0",
  lineHeight: "1.5",
  textAlign: "center",
  backgroundColor: "#f8f9fa",
  padding: "15px", // Réduit de 20px à 15px
  borderRadius: "6px", // Réduit de 8px à 6px
  border: "1px solid #e9ecef",
  fontFamily: "Arial, sans-serif",
};

const styleEmailLink: CSSProperties = {
  color: "#1f2937",
  textDecoration: "underline",
  fontWeight: "600",
}; 