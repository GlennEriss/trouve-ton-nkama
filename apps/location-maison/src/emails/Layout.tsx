import React, { CSSProperties, ReactNode } from "react";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import { Container } from "@react-email/container";
import { Img } from "@react-email/img";
import { Link } from "@react-email/link";
import { Column } from "@react-email/column";
import { Section } from "@react-email/section";
import { Row } from "@react-email/row";
import { Hr } from "@react-email/hr";
import theme from "./theme";
import { emailLogos } from "../../public/emails/config";

interface LayoutProps {
  children: ReactNode;
  logoUrl?: string;
  footerLogoUrl?: string;
  websiteUrl?: string;
  supportEmail?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  copyRight: string;
  unsubscribeUrl?: string;
}

const Layout = ({ 
  children, 
  logoUrl = emailLogos.production.header, // Logo header optimisé (200x200px)
  footerLogoUrl = emailLogos.production.footer, // Logo footer optimisé (80x80px)
  websiteUrl = "https://tonnkama.com",
  supportEmail = "support@tonnkama.com",
  socialLinks = {},
  copyRight,
  unsubscribeUrl
}: LayoutProps) => {
  return (
    <Html style={styleHTML} lang="fr">
      {/* CSS Media Queries pour mobile */}
      <style>
        {`
          @media only screen and (max-width: 600px) {
            .mobile-container {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              border-radius: 0 !important;
            }
            .mobile-padding {
              padding: 15px 10px !important;
            }
            .mobile-header {
              padding: 20px 15px !important;
            }
            .mobile-content {
              padding: 20px 15px !important;
            }
            .mobile-footer {
              padding: 20px 15px !important;
            }
            .mobile-logo-header {
              width: 60px !important;
              height: 60px !important;
            }
            .mobile-text-small {
              font-size: 12px !important;
            }
            .mobile-button {
              width: 100% !important;
              max-width: 280px !important;
              padding: 14px 20px !important;
              font-size: 16px !important;
            }
            .mobile-section {
              padding: 15px 10px !important;
              margin: 10px 0 !important;
            }
          }
        `}
      </style>
      <Container style={styleContainer} className="mobile-container">
        {/* Header professionnel avec logo et branding */}
        <Section style={styleHeader} className="mobile-header">
          <Row>
            {/* Logo à gauche */}
            <Column style={styleLogoColumn}>
              <img
                src={logoUrl}
                alt="Logo Trouve Ton Nkama"
                style={styleHeaderLogo}
                className="mobile-logo-header"
              />
            </Column>
            
            {/* Texte centré */}
            <Column style={styleBrandingColumn}>
              <Text style={styleHeaderTitle}>
                Trouve Ton Nkama
              </Text>
              <Text style={styleHeaderSubtitle} className="mobile-text-small">
                Votre plateforme immobilière de référence au Gabon
              </Text>
            </Column>
            
            {/* Colonne vide pour équilibrer */}
            <Column style={styleEmptyColumn}>
              &nbsp;
            </Column>
          </Row>
        </Section>

        {/* Contenu principal avec bordure professionnelle */}
        <Section style={styleContent}>
          <Row>
            <Column style={styleContentColumn} className="mobile-content">
              {children}
            </Column>
          </Row>
        </Section>

        {/* Footer professionnel */}
        <Section style={styleFooter} className="mobile-footer">
          <Hr style={styleHr} />
          
          {/* Logo footer */}
          <Row>
            <Column align="center">
              <img
                src={footerLogoUrl}
                alt="Logo Trouve Ton Nkama"
                style={styleFooterLogo}
              />
            </Column>
          </Row>
          
          {/* Lien vers le site */}
          <Row>
            <Column align="center">
              <Text style={styleFooterLinks}>
                <Link href={websiteUrl} style={styleFooterLink}>
                  🌐 Visitez notre site web
                </Link>
              </Text>
            </Column>
          </Row>

          {/* Réseaux sociaux */}
          {(socialLinks.facebook || socialLinks.twitter || socialLinks.instagram || socialLinks.linkedin) && (
            <Row style={styleSocialRow}>
              <Column align="center">
                <Text style={styleFooterTitle}>
                  Suivez-nous
                </Text>
                <Text style={styleFooterLinks}>
                  {socialLinks.facebook && (
                    <Link href={socialLinks.facebook} style={styleSocialLink}>
                      📘 Facebook
                    </Link>
                  )}
                  {socialLinks.facebook && socialLinks.twitter && " • "}
                  {socialLinks.twitter && (
                    <Link href={socialLinks.twitter} style={styleSocialLink}>
                      🐦 Twitter
                    </Link>
                  )}
                  {(socialLinks.twitter || socialLinks.facebook) && socialLinks.instagram && " • "}
                  {socialLinks.instagram && (
                    <Link href={socialLinks.instagram} style={styleSocialLink}>
                      📸 Instagram
                    </Link>
                  )}
                  {((socialLinks.twitter || socialLinks.facebook) || socialLinks.instagram) && socialLinks.linkedin && " • "}
                  {socialLinks.linkedin && (
                    <Link href={socialLinks.linkedin} style={styleSocialLink}>
                      💼 LinkedIn
                    </Link>
                  )}
                </Text>
              </Column>
            </Row>
          )}

          {/* Contact et informations légales */}
          <Row>
            <Column align="center">
              <Text style={styleFooterContact}>
                📧 {supportEmail} | 📞 +241 XX XX XX XX
              </Text>
              <Text style={styleFooterContact}>
                📍 Libreville, Gabon
              </Text>
              <Text style={styleFooterCopyright}>
                {copyRight}
              </Text>
            </Column>
          </Row>

          {/* Lien de désinscription */}
          {unsubscribeUrl && (
            <Row>
              <Column align="center">
                <Text style={styleUnsubscribe}>
                  <Link href={unsubscribeUrl} style={styleUnsubscribeLink}>
                    Se désinscrire de ces emails
                  </Link>
                </Text>
              </Column>
            </Row>
          )}
        </Section>
      </Container>
    </Html>
  );
};

// Styles améliorés et professionnels
const styleHTML: CSSProperties = {
  backgroundColor: "#f8f9fa",
  fontFamily: theme.fonts.body,
  margin: 0,
  padding: 0,
};

const styleContainer: CSSProperties = {
  backgroundColor: "#ffffff",
  maxWidth: "600px",
  width: "100%", // Responsive par défaut
  margin: "0 auto",
  padding: "0",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  borderRadius: "8px",
  overflow: "hidden",
  // Tables HTML email responsive
  tableLayout: "fixed" as const,
};

const styleHeader: CSSProperties = {
  backgroundColor: theme.colors.primary,
  backgroundImage: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
  padding: "25px 15px", // Réduit pour mobile par défaut
  borderRadius: "0",
  width: "100%",
};

const styleLogoColumn: CSSProperties = {
  width: "120px",
  verticalAlign: "middle",
  textAlign: "left" as const,
};

const styleBrandingColumn: CSSProperties = {
  verticalAlign: "middle",
  textAlign: "center" as const,
  width: "auto",
};

const styleEmptyColumn: CSSProperties = {
  width: "120px",
  verticalAlign: "middle",
};

const styleHeaderLogo: CSSProperties = {
  width: "80px",
  height: "80px",
  borderRadius: "8px",
  backgroundColor: "#ffffff",
  padding: "8px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  display: "block",
  border: "2px solid #ffffff",
};

const styleHeaderTitle: CSSProperties = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 5px 0",
  fontFamily: theme.fonts.heading,
  textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
};

const styleHeaderSubtitle: CSSProperties = {
  color: "#ffffff",
  fontSize: "14px",
  margin: "0",
  opacity: "0.9",
  fontFamily: theme.fonts.body,
};

const styleContent: CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "0",
};

const styleContentColumn: CSSProperties = {
  padding: "30px 20px", // Réduit pour mobile par défaut
  width: "100%",
};

const styleFooter: CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "30px 20px",
  borderTop: `3px solid ${theme.colors.primary}`,
};

const styleFooterLogo: CSSProperties = {
  width: "40px",
  height: "40px",
  margin: "0 0 20px 0",
  opacity: "0.9",
  display: "block",
  backgroundColor: "#ffffff",
  padding: "4px",
  borderRadius: "6px",
  border: "1px solid #e1e5e9",
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${theme.colors.muted}`,
  margin: "0 0 20px 0",
};

const styleFooterTitle: CSSProperties = {
  color: theme.colors.primary,
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 10px 0",
  fontFamily: theme.fonts.heading,
};

const styleFooterLinks: CSSProperties = {
  fontSize: "14px",
  margin: "0 0 20px 0",
  lineHeight: "1.5",
  color: theme.colors.textSecondary,
};

const styleFooterLink: CSSProperties = {
  color: theme.colors.primary,
  textDecoration: "none",
  fontWeight: "500",
};

const styleSocialRow: CSSProperties = {
  marginTop: "10px",
};

const styleSocialLink: CSSProperties = {
  color: theme.colors.secondary,
  textDecoration: "none",
  fontWeight: "500",
};

const styleFooterContact: CSSProperties = {
  fontSize: "13px",
  color: theme.colors.textSecondary,
  margin: "0 0 8px 0",
  lineHeight: "1.4",
};

const styleFooterCopyright: CSSProperties = {
  fontSize: "12px",
  color: theme.colors.textSecondary,
  margin: "20px 0 0 0",
  fontStyle: "italic",
};

const styleUnsubscribe: CSSProperties = {
  fontSize: "12px",
  margin: "20px 0 0 0",
  padding: "10px 0",
  borderTop: "1px solid #e9ecef",
};

const styleUnsubscribeLink: CSSProperties = {
  color: theme.colors.textSecondary,
  textDecoration: "underline",
};

export default Layout; 