import React, { CSSProperties } from "react";
import { Text } from "@react-email/text";
import { Section } from "@react-email/section";
import { Row } from "@react-email/row";
import { Column } from "@react-email/column";
import { Button } from "@react-email/button";
import { Hr } from "@react-email/hr";
import Layout from "./Layout";
import theme from "./theme";
import { PasswordResetProps } from "./types";

const PasswordReset: React.FC<PasswordResetProps> = ({
  name,
  email,
  resetLink,
  texts,
}) => {
  return (
    <Layout
      copyRight={texts.copyRight}
      supportEmail={texts.supportEmail}
      websiteUrl={texts.websiteUrl}
    >
      {/* Message de salutation */}
      <Section>
        <Row>
          <Column>
            <Text style={styleGreeting}>
              {texts.greeting} {name} 🔒
            </Text>
            <Text style={styleMainText}>
              {texts.instruction}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Bouton de réinitialisation - TRÈS VISIBLE */}
      <Section style={styleButtonSection} className="mobile-section">
        <Row>
          <Column align="center">
            <Button
              href={resetLink}
              style={styleButton}
              className="mobile-button"
            >
              🔐 {texts.buttonText}
            </Button>
          </Column>
        </Row>
      </Section>

      {/* Informations d'expiration */}
      <Section className="mobile-section">
        <Row>
          <Column>
            <Text style={styleExpirationInfo}>
              ⏰ {texts.expirationInfo}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Informations de sécurité */}
      <Section>
        <Row>
          <Column>
            <Text style={styleSecurityInfo}>
              🔐 {texts.securityInfo}
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
              {resetLink}
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

      {/* Conseils de sécurité */}
      <Section>
        <Row>
          <Column>
            <Text style={styleSecurityTips}>
              🛡️ <strong>Conseils de sécurité :</strong>
            </Text>
            <Text style={styleSecurityTipsList}>
              • Choisissez un mot de passe fort avec au moins 8 caractères<br/>
              • Utilisez une combinaison de lettres, chiffres et symboles<br/>
              • Ne partagez jamais votre mot de passe avec qui que ce soit<br/>
              • Activez l'authentification à deux facteurs si disponible
            </Text>
          </Column>
        </Row>
      </Section>

      <Hr style={styleHr} />

      {/* Support */}
      <Section>
        <Row>
          <Column>
            <Text style={styleHelpText}>
              ⚠️ Vous n'avez pas demandé cette réinitialisation ? Contactez immédiatement notre équipe support à{" "}
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

export default PasswordReset;

// Styles améliorés pour une meilleure visibilité
const styleGreeting: CSSProperties = {
  fontSize: "20px", // Réduit pour cohérence
  fontWeight: "bold",
  color: "#111827", // Noir pour maximum de contraste
  margin: `0 0 20px 0`,
  lineHeight: "1.3",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleMainText: CSSProperties = {
  fontSize: "14px", // Réduit pour cohérence
  fontWeight: "normal",
  color: "#1f2937", // Plus foncé pour meilleure lisibilité
  margin: `0 0 20px 0`,
  lineHeight: "1.6",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleButtonSection: CSSProperties = {
  backgroundColor: "#eff6ff",
  padding: "20px 15px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "2px solid #93c5fd",
};

const styleButton: CSSProperties = {
  backgroundColor: "#2563eb", // Bleu rassurant pour la sécurité
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "14px 28px", // Légèrement plus grand pour mobile
  textDecoration: "none",
  display: "inline-block",
  margin: "8px 0",
  boxShadow: "0 4px 8px rgba(37, 99, 235, 0.2)",
  border: "2px solid #1d4ed8",
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

const styleExpirationInfo: CSSProperties = {
  fontSize: "14px",
  fontWeight: "700", // Plus gras pour meilleure visibilité
  color: "#ffffff", // Blanc pour contraste maximum
  margin: `0 0 20px 0`,
  lineHeight: "1.5",
  backgroundColor: "#d97706", // Orange/ambre moins alarmant que le rouge
  padding: "15px 20px",
  borderRadius: "8px",
  border: "2px solid #b45309",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
  textShadow: "2px 2px 4px rgba(0,0,0,0.9)", // Ombre plus prononcée
  letterSpacing: "0.5px", // Espacement pour clarté
};

const styleSecurityInfo: CSSProperties = {
  fontSize: "14px", // Réduit pour cohérence
  fontWeight: "600",
  color: "#0369a1", // Bleu vif pour l'info
  margin: `0 0 20px 0`,
  lineHeight: "1.5",
  backgroundColor: "#eff6ff",
  padding: "15px 20px",
  borderRadius: "8px",
  border: "2px solid #bfdbfe",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid #d1d5db`,
  margin: `25px 0`,
};

const styleSecondaryText: CSSProperties = {
  fontSize: "13px", // Réduit pour cohérence
  fontWeight: "500",
  color: "#374151", // Plus foncé
  margin: `0 0 8px 0`,
  lineHeight: "1.5",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleLinkText: CSSProperties = {
  fontSize: "12px",
  fontWeight: "normal",
  color: "#2563eb",
  margin: `0 0 20px 0`,
  lineHeight: "1.4",
  wordBreak: "break-all",
  backgroundColor: "#eff6ff",
  padding: "10px 15px",
  borderRadius: "6px",
  border: `1px solid #2563eb`,
  fontFamily: "monospace",
  textAlign: "center",
};

const styleAdditionalInfo: CSSProperties = {
  fontSize: "13px", // Réduit pour cohérence
  fontWeight: "normal",
  color: "#374151", // Plus foncé
  margin: `0 0 20px 0`,
  lineHeight: "1.6",
  textAlign: "center",
  backgroundColor: "#f8fafc",
  padding: "15px",
  borderRadius: "6px",
  border: "1px solid #e2e8f0",
  fontFamily: "Arial, sans-serif",
};

const styleSecurityTips: CSSProperties = {
  fontSize: "14px", // Réduit pour cohérence
  fontWeight: "600",
  color: "#1f2937", // Plus foncé
  margin: `0 0 10px 0`,
  lineHeight: "1.5",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleSecurityTipsList: CSSProperties = {
  fontSize: "13px", // Réduit pour cohérence
  fontWeight: "normal",
  color: "#374151", // Plus foncé
  margin: `0 0 20px 0`,
  lineHeight: "1.6",
  backgroundColor: "#f8f9fa",
  padding: "15px",
  borderRadius: "6px",
  border: `1px solid #d1d5db`,
  textAlign: "left",
  fontFamily: "Arial, sans-serif",
};

const styleHelpText: CSSProperties = {
  fontSize: "13px", // Réduit pour cohérence
  fontWeight: "600",
  color: "#d97706", // Orange pour attirer l'attention sans être alarmant
  margin: "0",
  lineHeight: "1.6",
  textAlign: "center",
  backgroundColor: "#fef3c7",
  padding: "15px",
  borderRadius: "6px",
  border: "1px solid #fbbf24",
  fontFamily: "Arial, sans-serif",
};

const styleEmailLink: CSSProperties = {
  color: "#d97706",
  textDecoration: "underline",
  fontWeight: "600",
  fontFamily: "Arial, sans-serif",
}; 