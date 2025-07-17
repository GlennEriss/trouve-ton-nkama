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
            <Text style={styleGreeting} className="mobile-text-large">
              {texts.greeting} {name} 🔒
            </Text>
            <Text style={styleMainText} className="mobile-text-medium">
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
            <Text style={styleExpirationInfo} className="mobile-text-medium">
              ⏰ {texts.expirationInfo}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Informations de sécurité */}
      <Section>
        <Row>
          <Column>
            <Text style={styleSecurityInfo} className="mobile-text-medium">
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
            <Text style={styleSecondaryText} className="mobile-text-small">
              🔗 Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
            </Text>
            <Text style={styleLinkText} className="mobile-text-small">
              {resetLink}
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

      {/* Conseils de sécurité */}
      <Section>
        <Row>
          <Column>
            <Text style={styleSecurityTips} className="mobile-text-medium">
              🛡️ <strong>Conseils de sécurité :</strong>
            </Text>
            <Text style={styleSecurityTipsList} className="mobile-text-small">
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
            <Text style={styleHelpText} className="mobile-text-small">
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

// Styles optimisés pour mobile
const styleGreeting: CSSProperties = {
  fontSize: "18px", // Réduit de 20px à 18px
  fontWeight: "bold",
  color: "#111827", // Noir pour maximum de contraste
  margin: `0 0 15px 0`, // Réduit de 20px à 15px
  lineHeight: "1.3",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleMainText: CSSProperties = {
  fontSize: "13px", // Réduit de 14px à 13px
  fontWeight: "normal",
  color: "#1f2937", // Plus foncé pour meilleure lisibilité
  margin: `0 0 15px 0`, // Réduit de 20px à 15px
  lineHeight: "1.5", // Réduit de 1.6 à 1.5
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleButtonSection: CSSProperties = {
  backgroundColor: "#eff6ff",
  padding: "15px 12px", // Réduit de 20px 15px à 15px 12px
  borderRadius: "6px", // Réduit de 8px à 6px
  margin: "15px 0", // Réduit de 20px à 15px
  border: "1px solid #93c5fd", // Réduit de 2px à 1px
};

const styleButton: CSSProperties = {
  backgroundColor: "#2563eb", // Bleu rassurant pour la sécurité
  borderRadius: "6px", // Réduit de 8px à 6px
  color: "#ffffff",
  fontSize: "14px", // Réduit de 16px à 14px
  fontWeight: "600",
  padding: "12px 20px", // Réduit de 14px 28px à 12px 20px
  textDecoration: "none",
  display: "inline-block",
  margin: "6px 0", // Réduit de 8px à 6px
  boxShadow: "0 3px 6px rgba(37, 99, 235, 0.2)", // Réduit l'ombre
  border: "1px solid #1d4ed8", // Réduit de 2px à 1px
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

const styleExpirationInfo: CSSProperties = {
  fontSize: "13px", // Réduit de 14px à 13px
  fontWeight: "700", // Plus gras pour meilleure visibilité
  color: "#ffffff", // Blanc pour contraste maximum
  margin: `0 0 15px 0`, // Réduit de 20px à 15px
  lineHeight: "1.4", // Réduit de 1.5 à 1.4
  backgroundColor: "#d97706", // Orange/ambre moins alarmant que le rouge
  padding: "12px 15px", // Réduit de 15px 20px à 12px 15px
  borderRadius: "6px", // Réduit de 8px à 6px
  border: "1px solid #b45309", // Réduit de 2px à 1px
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
  textShadow: "1px 1px 3px rgba(0,0,0,0.9)", // Ombre réduite
  letterSpacing: "0.3px", // Réduit l'espacement
};

const styleSecurityInfo: CSSProperties = {
  fontSize: "13px", // Réduit de 14px à 13px
  fontWeight: "600",
  color: "#0369a1", // Bleu vif pour l'info
  margin: `0 0 15px 0`, // Réduit de 20px à 15px
  lineHeight: "1.4", // Réduit de 1.5 à 1.4
  backgroundColor: "#eff6ff",
  padding: "12px 15px", // Réduit de 15px 20px à 12px 15px
  borderRadius: "6px", // Réduit de 8px à 6px
  border: "1px solid #bfdbfe", // Réduit de 2px à 1px
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid #d1d5db`,
  margin: `20px 0`, // Réduit de 25px à 20px
};

const styleSecondaryText: CSSProperties = {
  fontSize: "12px", // Réduit de 13px à 12px
  fontWeight: "500",
  color: "#374151", // Plus foncé
  margin: `0 0 6px 0`, // Réduit de 8px à 6px
  lineHeight: "1.4", // Réduit de 1.5 à 1.4
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleLinkText: CSSProperties = {
  fontSize: "11px", // Réduit de 12px à 11px
  fontWeight: "normal",
  color: "#2563eb",
  margin: `0 0 15px 0`, // Réduit de 20px à 15px
  lineHeight: "1.3", // Réduit de 1.4 à 1.3
  wordBreak: "break-all",
  backgroundColor: "#eff6ff",
  padding: "8px 12px", // Réduit de 10px 15px à 8px 12px
  borderRadius: "5px", // Réduit de 6px à 5px
  border: `1px solid #2563eb`,
  fontFamily: "monospace",
  textAlign: "center",
};

const styleAdditionalInfo: CSSProperties = {
  fontSize: "12px", // Réduit de 13px à 12px
  fontWeight: "normal",
  color: "#374151", // Plus foncé
  margin: `0 0 15px 0`, // Réduit de 20px à 15px
  lineHeight: "1.5", // Réduit de 1.6 à 1.5
  textAlign: "center",
  backgroundColor: "#f8fafc",
  padding: "12px", // Réduit de 15px à 12px
  borderRadius: "5px", // Réduit de 6px à 5px
  border: "1px solid #e2e8f0",
  fontFamily: "Arial, sans-serif",
};

const styleSecurityTips: CSSProperties = {
  fontSize: "13px", // Réduit de 14px à 13px
  fontWeight: "600",
  color: "#1f2937", // Plus foncé
  margin: `0 0 8px 0`, // Réduit de 10px à 8px
  lineHeight: "1.4", // Réduit de 1.5 à 1.4
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const styleSecurityTipsList: CSSProperties = {
  fontSize: "12px", // Réduit de 13px à 12px
  fontWeight: "normal",
  color: "#374151", // Plus foncé
  margin: `0 0 15px 0`, // Réduit de 20px à 15px
  lineHeight: "1.5", // Réduit de 1.6 à 1.5
  backgroundColor: "#f8f9fa",
  padding: "12px", // Réduit de 15px à 12px
  borderRadius: "5px", // Réduit de 6px à 5px
  border: `1px solid #d1d5db`,
  textAlign: "left",
  fontFamily: "Arial, sans-serif",
};

const styleHelpText: CSSProperties = {
  fontSize: "12px", // Réduit de 13px à 12px
  fontWeight: "600",
  color: "#d97706", // Orange pour attirer l'attention sans être alarmant
  margin: "0",
  lineHeight: "1.5", // Réduit de 1.6 à 1.5
  textAlign: "center",
  backgroundColor: "#fef3c7",
  padding: "12px", // Réduit de 15px à 12px
  borderRadius: "5px", // Réduit de 6px à 5px
  border: "1px solid #fbbf24",
  fontFamily: "Arial, sans-serif",
};

const styleEmailLink: CSSProperties = {
  color: "#d97706",
  textDecoration: "underline",
  fontWeight: "600",
  fontFamily: "Arial, sans-serif",
}; 