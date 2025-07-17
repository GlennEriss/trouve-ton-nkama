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
import { supportContact } from "../constantes";

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
  supportEmail = supportContact.email,
  socialLinks = {},
  copyRight,
  unsubscribeUrl
}: LayoutProps) => {
  return (
    <Html style={styleHTML} lang="fr">
      {/* CSS Media Queries améliorées pour mobile */}
      <style>
        {`
          @media only screen and (max-width: 600px) {
            .mobile-container {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
            .mobile-padding {
              padding: 10px 8px !important;
            }
            .mobile-header {
              padding: 15px 10px !important;
            }
            .mobile-content {
              padding: 15px 10px !important;
            }
            .mobile-footer {
              padding: 15px 10px !important;
            }
            .mobile-logo-header {
              width: 50px !important;
              height: 50px !important;
            }
            .mobile-text-small {
              font-size: 11px !important;
            }
            .mobile-text-medium {
              font-size: 13px !important;
            }
            .mobile-text-large {
              font-size: 16px !important;
            }
            .mobile-button {
              width: 100% !important;
              max-width: 100% !important;
              padding: 12px 16px !important;
              font-size: 14px !important;
              min-width: auto !important;
            }
            .mobile-section {
              padding: 10px 8px !important;
              margin: 8px 0 !important;
            }
            .mobile-header-title {
              font-size: 20px !important;
            }
            .mobile-header-subtitle {
              font-size: 12px !important;
            }
            .mobile-header-layout {
              display: block !important;
            }
            .mobile-header-logo {
              text-align: center !important;
              margin-bottom: 10px !important;
            }
            .mobile-header-text {
              text-align: center !important;
            }
          }
          
          @media only screen and (max-width: 480px) {
            .mobile-container {
              padding: 0 !important;
            }
            .mobile-content {
              padding: 12px 8px !important;
            }
            .mobile-button {
              font-size: 13px !important;
              padding: 10px 14px !important;
            }
            .mobile-text-small {
              font-size: 10px !important;
            }
            .mobile-text-medium {
              font-size: 12px !important;
            }
            .mobile-text-large {
              font-size: 15px !important;
            }
          }
        `}
      </style>
      <Container style={styleContainer} className="mobile-container">
        {/* Header optimisé pour mobile */}
        <Section style={styleHeader} className="mobile-header">
          <Row className="mobile-header-layout">
            {/* Logo centré pour mobile */}
            <Column style={styleLogoColumn} className="mobile-header-logo">
              <img
                src={logoUrl}
                alt="Logo Trouve Ton Nkama"
                style={styleHeaderLogo}
                className="mobile-logo-header"
              />
            </Column>
            
            {/* Texte centré */}
            <Column style={styleBrandingColumn} className="mobile-header-text">
              <Text style={styleHeaderTitle} className="mobile-header-title">
                Trouve Ton Nkama
              </Text>
              <Text style={styleHeaderSubtitle} className="mobile-header-subtitle">
                Votre plateforme immobilière de référence au Gabon
              </Text>
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
  maxWidth: "580px", // Réduit de 600px à 580px
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
  padding: "20px 15px", // Réduit pour mobile par défaut
  borderRadius: "0",
  width: "100%",
};

const styleLogoColumn: CSSProperties = {
  width: "60px", // Réduit de 120px à 100px
  verticalAlign: "middle",
  textAlign: "left" as const,
};

const styleBrandingColumn: CSSProperties = {
  verticalAlign: "middle",
  textAlign: "center" as const,
  width: "auto",
};

const styleHeaderLogo: CSSProperties = {
  width: "70px", // Réduit de 80px à 70px
  height: "70px", // Réduit de 80px à 70px
  borderRadius: "8px",
  backgroundColor: "transparent",
  padding: "0", // Supprimé le padding
  boxShadow: "none", // Supprimé l'ombre
  display: "block",
  border: "none", // Supprimé la bordure
  filter: "brightness(0) invert(1)", // Rend le logo blanc
};

const styleHeaderTitle: CSSProperties = {
  color: "#ffffff",
  fontSize: "24px", // Réduit de 28px à 24px
  fontWeight: "bold",
  margin: "0 0 0 0",
  fontFamily: theme.fonts.heading,
  textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
};

const styleHeaderSubtitle: CSSProperties = {
  color: "#ffffff",
  fontSize: "13px", // Réduit de 14px à 13px
  margin: "0",
  opacity: "0.9",
  fontFamily: theme.fonts.body,
};

const styleContent: CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "0",
};

const styleContentColumn: CSSProperties = {
  padding: "25px 15px", // Réduit pour mobile par défaut
  width: "100%",
};

const styleFooter: CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "25px 15px", // Réduit
  borderTop: `3px solid ${theme.colors.primary}`,
};

const styleFooterLogo: CSSProperties = {
  width: "35px", // Réduit de 40px à 35px
  height: "35px", // Réduit de 40px à 35px
  margin: "0 0 15px 0", // Réduit de 20px à 15px
  opacity: "0.9",
  display: "block",
  backgroundColor: "transparent",
  padding: "0", // Supprimé le padding
  borderRadius: "0", // Supprimé le border-radius
  border: "none", // Supprimé la bordure
  filter: "brightness(0) invert(1)", // Rend le logo blanc
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${theme.colors.muted}`,
  margin: "0 0 15px 0", // Réduit de 20px à 15px
};

const styleFooterTitle: CSSProperties = {
  color: theme.colors.primary,
  fontSize: "15px", // Réduit de 16px à 15px
  fontWeight: "600",
  margin: "0 0 8px 0", // Réduit de 10px à 8px
  fontFamily: theme.fonts.heading,
};

const styleFooterLinks: CSSProperties = {
  fontSize: "13px", // Réduit de 14px à 13px
  margin: "0 0 15px 0", // Réduit de 20px à 15px
  lineHeight: "1.5",
  color: theme.colors.textSecondary,
};

const styleFooterLink: CSSProperties = {
  color: theme.colors.primary,
  textDecoration: "none",
  fontWeight: "500",
};

const styleSocialRow: CSSProperties = {
  marginTop: "8px", // Réduit de 10px à 8px
};

const styleSocialLink: CSSProperties = {
  color: theme.colors.secondary,
  textDecoration: "none",
  fontWeight: "500",
};

const styleFooterContact: CSSProperties = {
  fontSize: "12px", // Réduit de 13px à 12px
  color: theme.colors.textSecondary,
  margin: "0 0 6px 0", // Réduit de 8px à 6px
  lineHeight: "1.4",
};

const styleFooterCopyright: CSSProperties = {
  fontSize: "11px", // Réduit de 12px à 11px
  color: theme.colors.textSecondary,
  margin: "15px 0 0 0", // Réduit de 20px à 15px
  fontStyle: "italic",
};

const styleUnsubscribe: CSSProperties = {
  fontSize: "11px", // Réduit de 12px à 11px
  margin: "15px 0 0 0", // Réduit de 20px à 15px
  padding: "8px 0", // Réduit de 10px à 8px
  borderTop: "1px solid #e9ecef",
};

const styleUnsubscribeLink: CSSProperties = {
  color: theme.colors.textSecondary,
  textDecoration: "underline",
};

export default Layout; 