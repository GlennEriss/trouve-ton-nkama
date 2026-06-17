import React from 'react'
import Navbar from './Navbar'
import Image from 'next/image'
import Link from 'next/link'
import { routes } from '@/constantes/routes'
import { useCurrentUser } from '@/hooks/use-current-user'
import CarouselPropertyType from './CarouselPropertyType'
import PropertyByProvince from './PropertyByProvince'
import FeaturedSection from './FeaturedSection'
import TrendingSection from './TrendingSection'
import RecentSection from './RecentSection'
import { motion, useReducedMotion } from 'framer-motion'
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking'
import HomeHeroSponsoredSwap from './HomeHeroSponsoredSwap'

const detailssection2 = [
  {
    title: "Créez votre compte",
    description: "Inscrivez-vous en quelques clics.",
    image: "/assets/home-page/edit-2_1.webp"
  },
  {
    title: "Postez vos annonces",
    description: "Ajoutez photos et informations de votre bien.",
    image: "/assets/home-page/sms-tracking_1.webp"
  },
  {
    title: "Recevez des contacts",
    description: "Les visiteurs vous contactent via WhatsApp.",
    image: "/assets/home-page/messages.webp"
  }
]
export default function HomePageDesktopComponent() {
  const { user } = useCurrentUser()
  const { trackEvent } = useTrackEvent()
  const isAnnouncer = Array.isArray(user?.roles) && user.roles.includes('Announcer')
  const shouldReduceMotion = useReducedMotion()
  const publishLink = !user
    ? routes.public.signin
    : isAnnouncer
      ? routes.protected.add_property
      : routes.public.search_property

  const getRevealProps = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
      }

  return (
    <motion.div
      className='container p-5 mx-auto max-w-[1280px] 2xl:max-w-[1440px] relative'
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={shouldReduceMotion ? {} : { opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* Forme 1 - Derrière navbar et première section */}
      <div className="absolute top-0 -left-[30vw] w-full h-[530px] -z-10">
        <Image
          src="/assets/home-page/form.webp"
          alt="Background shape"
          fill
          className="object-cover opacity-5 xl:opacity-15 lg:-rotate-45 xl:-rotate-[160deg]"
        />
      </div>

      <Navbar />
      <motion.div {...getRevealProps(0.05)}>
        <HomeHeroSponsoredSwap reduceMotion={shouldReduceMotion} />
      </motion.div>
      <motion.section className='mb-8 mt-10' {...getRevealProps(0.08)}>
        <FeaturedSection />
      </motion.section>
      {/* <section className='mt-10 lg:my-20'>
        <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold leading-tight text-center text-[#146B67] dark:text-[#1FA89B]">
          Développez votre activité immobilière en toute simplicité.
        </h1>
        <div className='grid grid-cols-3 lg:mt-5 gap-4'>
          {
            detailssection2.map((item, index) => (
              <div
                key={index}
                className='bg-white dark:bg-gray-800 p-6 rounded-xl hover:shadow-md dark:hover:shadow-[#1FA89B]/10 transition-all flex flex-col items-center h-[200px] dark:border dark:border-gray-700'
              >
                <div className="h-[60px] flex items-center justify-center">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={50}
                    height={50}
                    className="object-contain dark:filter dark:brightness-90"
                  />
                </div>
                <div className="h-[30px] flex items-center justify-center">
                  <h2 className='text-lg font-bold text-center text-[#146B67] dark:text-[#1FA89B]'>
                    {item.title}
                  </h2>
                </div>
                <div className="h-[60px] flex items-center justify-center">
                  <p className='text-sm text-gray-600 dark:text-gray-300 text-center'>
                    {item.description}
                  </p>
                </div>
              </div>
            ))
          }
        </div>
      </section> */}

      <motion.section
        className='relative overflow-hidden bg-gradient-to-r from-[#146B67]/5 via-[#1FA89B]/10 to-[#146B67]/5 p-8 py-16 rounded-3xl'
        {...getRevealProps(0.1)}
      >
        {/* Forme 2 - Derrière la 3ème section */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 overflow-hidden">
          <Image
            src="/assets/home-page/form.webp"
            alt="Background shape"
            fill
            className="object-cover opacity-10 rotate-180"
          />
        </div>
        <div className='relative z-10 space-y-8'>
          <div className='text-center space-y-3'>
            <h1 className='text-xl md:text-2xl xl:text-3xl font-bold text-[#146B67]'>Quels sont vos besoins ?</h1>
            <p className='text-gray-600 max-w-2xl mx-auto'>Que vous souhaitiez publier une annonce ou trouver votre prochain logement, nous sommes là pour vous accompagner</p>
          </div>
          <div className='flex flex-col md:flex-row gap-4 max-w-2xl mx-auto'>
            <Link
              href={publishLink}
              onClick={() =>
                trackEvent(trackingEvents.CTA_HOME_PUBLISH_CLICK, {
                  source: 'home_desktop_needs_section',
                  destination: publishLink,
                })
              }
              className='flex-1 group relative overflow-hidden bg-gradient-to-r from-[#146B67] to-[#1FA89B] text-white font-semibold py-4 px-8 rounded-xl flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1'
            >
              <span className='relative z-10'>Publier une annonce</span>
              <div className='absolute inset-0 bg-gradient-to-r from-[#1FA89B] to-[#146B67] opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
            </Link>
            <Link
              href={routes.public.search_property}
              onClick={() =>
                trackEvent(trackingEvents.CTA_HOME_SEARCH_CLICK, {
                  source: 'home_desktop_needs_section',
                  destination: routes.public.search_property,
                })
              }
              className='flex-1 group relative overflow-hidden bg-white text-[#146B67] font-semibold py-4 px-8 rounded-xl flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-[#146B67]/10 hover:border-[#146B67]/30'
            >
              <span>Rechercher une annonce</span>
            </Link>
          </div>
        </div>
      </motion.section>

      <motion.section className='space-y-5 p-5 mb-8' {...getRevealProps(0.12)}>
        <h1 className='text-xl lg:text-2xl xl:text-3xl leading-tight text-center font-bold text-[#146B67] my-5'>Types d'annonces</h1>
        <CarouselPropertyType />
      </motion.section>

      <motion.section className='mb-8' {...getRevealProps(0.14)}>
        <TrendingSection />
      </motion.section>

      <motion.section className='mb-8' {...getRevealProps(0.16)}>
        <RecentSection />
      </motion.section>

      <motion.section className='space-y-5 m-5' {...getRevealProps(0.18)}>
        <h1 className='text-xl lg:text-2xl xl:text-3xl leading-tight font-bold text-center text-[#146B67] my-10'>Annonces par province</h1>
        <PropertyByProvince />
      </motion.section>

      <motion.section className='rounded-2xl bg-white border border-gray-100 p-6 space-y-4' {...getRevealProps(0.19)}>
        <h2 className='text-xl lg:text-2xl font-bold text-[#146B67]'>Recherches immobilières populaires</h2>
        <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
          <Link href="/immobilier/location/maison" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-[#146B67] hover:text-[#146B67] transition-colors">
            Maisons à louer au Gabon
          </Link>
          <Link href="/immobilier/vente/maison" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-[#146B67] hover:text-[#146B67] transition-colors">
            Maisons à vendre au Gabon
          </Link>
          <Link href="/immobilier/location/appartement/libreville" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-[#146B67] hover:text-[#146B67] transition-colors">
            Appartements à louer à Libreville
          </Link>
        </div>
      </motion.section>

      <motion.section
        className='rounded-3xl bg-gradient-to-r from-[#C1DEE8] to-[#FBD9B9] p-8 lg:p-12 relative mt-10 overflow-visible mb-32 lg:mb-40'
        {...getRevealProps(0.2)}
      >
        <div className='flex flex-col gap-5 max-w-xl'>
          <h1 className='text-2xl lg:text-3xl xl:text-4xl text-[#146B67] font-bold flex flex-col gap-1'>
            <span>Vous recherchez</span>
            <span>un nouveau logement ?</span>
            <span>Parcourez notre catalogue !</span>
          </h1>
          <p className='flex flex-col gap-1 text-lg lg:text-xl text-gray-700'>
            <span>
              Maisons, appartements, terrains…
            </span>
            <span>
              Trouvez le bien qui vous correspond
            </span>
            <span>
              en toute simplicité.
            </span>
          </p>
          <Link
            href={routes.public.search_property}
            onClick={() =>
              trackEvent(trackingEvents.CTA_HOME_EXPLORE_CLICK, {
                source: 'home_desktop_bottom_section',
                destination: routes.public.search_property,
              })
            }
            className='bg-white hover:bg-[#146B67] text-[#146B67] hover:text-white px-8 py-3 rounded-full text-center font-semibold w-fit transition-all duration-300 shadow-lg hover:shadow-xl mt-4'
          >
            Explorez maintenant
          </Link>
        </div>
        <div className="absolute bottom-20 translate-y-1/3 right-0 lg:translate-y-1/3 xl:right-20">
          <Image
            src="/assets/home-page/rendering.webp"
            alt="Home Page Desktop Component"
            width={450}
            height={450}
            quality={100}
            priority
            className="object-contain"
          />
        </div>
      </motion.section>
    </motion.div>
  )
}
