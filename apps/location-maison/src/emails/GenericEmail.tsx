import React, { CSSProperties } from "react";
import { Text } from "@react-email/text";
import { Section } from "@react-email/section";
import { Row } from "@react-email/row";
import { Column } from "@react-email/column";
import { Button } from "@react-email/button";
import { Hr } from "@react-email/hr";
import Layout from "./Layout";
import theme from "./theme";
import { GenericEmailProps } from "./types";

const GenericEmail: React.FC<GenericEmailProps> = ({
  name,
  email,
  actionLink,
  texts,
}) => {
  return (
    <Layout
      copyRight={texts.copyRight}
      supportEmail={texts.supportEmail}
      websiteUrl={texts.websiteUrl}
    >
      {/* En-tête avec titre */}
      <Section>
        <Row>
          <Column>
            <Text style={styleTitle}>
              {texts.title}
            </Text>
            {texts.subtitle && (
              <Text style={styleSubtitle}>
                {texts.subtitle}
              </Text>
            )}
          </Column>
        </Row>
      </Section>

      {/* Message de salutation */}
      <Section>
        <Row>
          <Column>
            <Text style={styleGreeting}>
              {texts.greeting} {name} 👋
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Message principal */}
      <Section>
        <Row>
          <Column>
            <Text style={styleMainText}>
              {texts.mainMessage}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Bouton d'action (optionnel) */}
      {actionLink && texts.buttonText && (
        <Section>
          <Row>
            <Column align="center">
              <Button
                href={actionLink}
                style={styleButton}
              >
                {texts.buttonText}
              </Button>
            </Column>
          </Row>
        </Section>
      )}

      {/* Séparateur */}
      <Hr style={styleDivider} />

      {/* Message de pied de page */}
      <Section>
        <Row>
          <Column>
            <Text style={styleFooterText}>
              {texts.footerMessage}
            </Text>
            {texts.additionalInfo && (
              <Text style={styleAdditionalInfo}>
                {texts.additionalInfo}
              </Text>
            )}
          </Column>
        </Row>
      </Section>

      {/* Informations de test en mode développement */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <Hr style={styleDivider} />
          <Section>
            <Row>
              <Column>
                <Text style={styleDebugInfo}>
                  🔧 <strong>Mode Test</strong>
                </Text>
                <Text style={styleDebugDetails}>
                  Email destinataire: {email}
                </Text>
                <Text style={styleDebugDetails}>
                  Nom: {name}
                </Text>
                {actionLink && (
                  <Text style={styleDebugDetails}>
                    Lien d'action: {actionLink}
                  </Text>
                )}
                <Text style={styleDebugDetails}>
                  Template: Email Générique
                </Text>
              </Column>
            </Row>
          </Section>
        </>
      )}
    </Layout>
  );
};

// Styles
const styleTitle: CSSProperties = {
  fontSize: "28px",
  fontWeight: "bold",
  color: theme.colors.primary,
  textAlign: "center",
  margin: "0 0 16px 0",
  lineHeight: "1.3",
};

const styleSubtitle: CSSProperties = {
  fontSize: "18px",
  color: theme.colors.textSecondary,
  textAlign: "center",
  margin: "0 0 24px 0",
  fontWeight: "500",
};

const styleGreeting: CSSProperties = {
  fontSize: "20px",
  fontWeight: "600",
  color: theme.colors.textPrimary,
  margin: "0 0 16px 0",
  lineHeight: "1.4",
};

const styleMainText: CSSProperties = {
  fontSize: "16px",
  color: theme.colors.textPrimary,
  margin: "0 0 24px 0",
  lineHeight: "1.6",
};

const styleButton: CSSProperties = {
  backgroundColor: theme.colors.primary,
  color: theme.colors.white,
  padding: "16px 32px",
  textDecoration: "none",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "16px",
  border: "none",
  display: "inline-block",
  textAlign: "center",
  cursor: "pointer",
  margin: "16px 0",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
};

const styleDivider: CSSProperties = {
  borderColor: theme.colors.border,
  margin: "32px 0",
};

const styleFooterText: CSSProperties = {
  fontSize: "14px",
  color: theme.colors.textSecondary,
  margin: "0 0 12px 0",
  lineHeight: "1.5",
};

const styleAdditionalInfo: CSSProperties = {
  fontSize: "13px",
  color: theme.colors.textTertiary,
  margin: "0 0 8px 0",
  lineHeight: "1.4",
  fontStyle: "italic",
};

const styleDebugInfo: CSSProperties = {
  fontSize: "14px",
  color: theme.colors.warning,
  margin: "0 0 8px 0",
  fontWeight: "600",
};

const styleDebugDetails: CSSProperties = {
  fontSize: "12px",
  color: theme.colors.textSecondary,
  margin: "0 0 4px 0",
  fontFamily: "monospace",
  backgroundColor: "#f8f9fa",
  padding: "4px 8px",
  borderRadius: "4px",
  display: "block",
};

export default GenericEmail; 