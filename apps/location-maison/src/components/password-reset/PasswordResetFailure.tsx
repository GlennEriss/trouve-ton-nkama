'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Home, LifeBuoy, RefreshCw, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/logo/Logo';
import { routes } from '@/constantes/routes';
import { supportContact } from '@/constantes';
import { Button } from '@/components/ui/button';
import { ButtonApp } from '@/components/shared/ui/ButtonApp';

const LEFT_PANEL_BG_IMAGE = '/auth-image.png';

const featureVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

const features = [
  {
    icon: ShieldAlert,
    title: 'Lien non valide',
    desc: 'Le code de réinitialisation est expiré ou déjà utilisé.',
  },
  {
    icon: RefreshCw,
    title: 'Nouvelle tentative',
    desc: 'Générez un nouveau lien de réinitialisation sécurisé.',
  },
  {
    icon: LifeBuoy,
    title: 'Support disponible',
    desc: "L'équipe support peut vous assister si le problème persiste.",
  },
];

const causes = [
  "Le lien a expiré (durée limitée).",
  'Le lien a déjà été utilisé.',
  "L'URL a été tronquée ou modifiée.",
  'Un lien plus récent a été généré.',
];

const PasswordResetFailure: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-rose-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-red-700 to-destructive" />

        <div
          className="absolute inset-0 bg-cover bg-no-repeat opacity-15 mix-blend-overlay blur-[1px] pointer-events-none"
          style={{
            backgroundImage: `url(${LEFT_PANEL_BG_IMAGE})`,
            backgroundPosition: 'center bottom',
          }}
          aria-hidden
        />

        <motion.div
          className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-40 left-10 w-48 h-48 bg-red-300/20 rounded-full blur-2xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, delay: 2 }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          <div>
            <Link href={routes.public.homePage} className="flex items-center gap-3 mb-12 group">
              <motion.div whileHover={{ rotate: 10 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Logo width="56px" height="56px" />
              </motion.div>
              <span className="text-2xl font-bold tracking-tight">Trouve Ton Nkama</span>
            </Link>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl xl:text-5xl font-bold leading-tight mb-6"
            >
              Réinitialisation
              <br />
              <span className="text-rose-200">non aboutie</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-white/80 max-w-md"
            >
              Le lien utilisé n&apos;est plus exploitable. Vous pouvez générer un nouveau lien en quelques secondes.
            </motion.p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                custom={index}
                initial="initial"
                animate="animate"
                variants={featureVariants}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10"
              >
                <div className="p-3 rounded-xl bg-white/20">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-white/70">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-sm text-white/50">© 2026 Trouve Ton Nkama. Tous droits réservés.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Logo width="48px" height="48px" />
            <span className="text-xl font-bold text-primary">Trouve Ton Nkama</span>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-black/30 p-8 lg:p-10 border border-gray-100 dark:border-gray-800">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Lien invalide ou expiré
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Impossible de finaliser la réinitialisation avec ce lien.
            </p>

            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 mb-6">
              <p className="text-sm font-semibold text-red-800 mb-2">Causes possibles</p>
              <ul className="space-y-1 text-sm text-red-700">
                {causes.map((cause) => (
                  <li key={cause}>• {cause}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <ButtonApp
                title="Demander un nouveau lien"
                className="bg-gradient-to-r from-primary to-secondary"
                onClick={() => router.push(routes.public.passwordResetRequest)}
              />

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full h-12"
                onClick={() => router.push(routes.public.signin)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Button>

              <Link
                href={routes.public.homePage}
                className="inline-flex items-center gap-2 justify-center w-full text-sm text-gray-500 hover:text-primary"
              >
                <Home className="w-4 h-4" />
                Retour à l&apos;accueil
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Besoin d&apos;aide?
              </p>
              <div className="text-sm space-y-1">
                <a href={`mailto:${supportContact.email}`} className="block text-primary hover:underline font-medium">
                  {supportContact.email}
                </a>
                <a href={`tel:${supportContact.phone}`} className="block text-primary hover:underline font-medium">
                  {supportContact.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetFailure;
