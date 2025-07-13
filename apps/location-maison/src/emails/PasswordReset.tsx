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

      {/* Bouton de réinitialisation */}
      <Section>
        <Row>
          <Column align="center">
            <Button
              href={resetLink}
              style={styleButton}
            >
              {texts.buttonText}
            </Button>
          </Column>
        </Row>
      </Section>

      {/* Informations d'expiration */}
      <Section>
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
              Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
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
              <strong>Conseils de sécurité :</strong>
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
              Vous n'avez pas demandé cette réinitialisation ? Contactez immédiatement notre équipe support à{" "}
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

// Styles CSS
const styleGreeting: CSSProperties = {
  fontSize: theme.font.size.xl,
  fontWeight: theme.font.weight.bold,
  color: theme.colors.gray[900],
  margin: `0 0 ${theme.spacing.md}`,
  lineHeight: theme.font.lineHeight.tight,
};

const styleMainText: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[700],
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.relaxed,
};

const styleButton: CSSProperties = {
  backgroundColor: theme.colors.error,
  borderRadius: theme.borderRadius.lg,
  color: theme.colors.white,
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.semibold,
  padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
  textDecoration: "none",
  display: "inline-block",
  margin: `${theme.spacing.lg} 0`,
  boxShadow: theme.shadow.md,
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
};

const styleExpirationInfo: CSSProperties = {
  fontSize: theme.font.size.sm,
  fontWeight: theme.font.weight.medium,
  color: theme.colors.warning,
  margin: `0 0 ${theme.spacing.md}`,
  lineHeight: theme.font.lineHeight.normal,
  backgroundColor: "#FFF8E1",
  padding: theme.spacing.sm,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.warning}`,
};

const styleSecurityInfo: CSSProperties = {
  fontSize: theme.font.size.sm,
  fontWeight: theme.font.weight.medium,
  color: theme.colors.info,
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.normal,
  backgroundColor: "#E3F2FD",
  padding: theme.spacing.sm,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.info}`,
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${theme.colors.gray[300]}`,
  margin: `${theme.spacing.lg} 0`,
};

const styleSecondaryText: CSSProperties = {
  fontSize: theme.font.size.sm,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[600],
  margin: `0 0 ${theme.spacing.xs}`,
  lineHeight: theme.font.lineHeight.normal,
};

const styleLinkText: CSSProperties = {
  fontSize: theme.font.size.sm,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.primary,
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.normal,
  wordBreak: "break-all",
  backgroundColor: theme.colors.gray[100],
  padding: theme.spacing.sm,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.gray[300]}`,
};

const styleAdditionalInfo: CSSProperties = {
  fontSize: theme.font.size.sm,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[600],
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.relaxed,
};

const styleSecurityTips: CSSProperties = {
  fontSize: theme.font.size.sm,
  fontWeight: theme.font.weight.semibold,
  color: theme.colors.gray[800],
  margin: `0 0 ${theme.spacing.xs}`,
  lineHeight: theme.font.lineHeight.normal,
};

const styleSecurityTipsList: CSSProperties = {
  fontSize: theme.font.size.sm,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[700],
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.relaxed,
  backgroundColor: theme.colors.gray[100],
  padding: theme.spacing.sm,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.gray[200]}`,
};

const styleHelpText: CSSProperties = {
  fontSize: theme.font.size.sm,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[600],
  margin: "0",
  lineHeight: theme.font.lineHeight.relaxed,
  textAlign: "center",
  backgroundColor: "#FFF3E0",
  padding: theme.spacing.sm,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.warning}`,
};

const styleEmailLink: CSSProperties = {
  color: theme.colors.error,
  textDecoration: "none",
  fontWeight: theme.font.weight.medium,
}; 