'use client'
import { useAlgoliaContext } from '@/providers/AlgoliaContext';
import React from 'react'
import { Search, MapPin } from 'lucide-react';
import { Input } from '../ui/input';
import Form from 'next/form'
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { useCurrentUser } from '@/hooks/use-current-user';
import Navbar from './Navbar';
import { FilterModalHomePage } from './FilterModalHomePage';
import PropertyByProvince from './PropertyByProvince';
import CarouselPropertyType from './CarouselPropertyType';
import { useWindowSize } from '@/hooks/useSize';
import { cn } from '@/lib/utils';
import FeaturedSection from './FeaturedSection';
import TrendingSection from './TrendingSection';
import RecentSection from './RecentSection';
import { motion, useReducedMotion } from 'framer-motion';
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking';

export default function HomePageMobileComponent() {
    const {
        searchText,
        setSearchText,
    } = useAlgoliaContext();

    const { user } = useCurrentUser()
    const { trackEvent } = useTrackEvent()
    const isAnnouncer = Array.isArray(user?.roles) && user.roles.includes('Announcer')
    const publishLink = !user
        ? routes.public.signin
        : isAnnouncer
            ? routes.protected.add_property
            : routes.public.search_property
    const { width } = useWindowSize()
    const shouldReduceMotion = useReducedMotion()
    // Porte de garage: gestion de la navbar animée
    const [navbarVisible, setNavbarVisible] = React.useState(false);
    const [navbarHeight, setNavbarHeight] = React.useState(0);
    const navbarRef = React.useRef<HTMLDivElement | null>(null);
    const searchSectionRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    setNavbarVisible(true);
                } else {
                    setNavbarVisible(false);
                }
            },
            { threshold: 0.1 }
        );

        const current = searchSectionRef.current;
        if (current) {
            observer.observe(current);
        }

        return () => {
            if (current) {
                observer.unobserve(current);
            }
        };
    }, []);

    // Capture la hauteur du navbar pour gérer l'effet de porte de garage
    React.useEffect(() => {
        if (navbarRef.current) {
            setNavbarHeight(navbarRef.current.offsetHeight);
        }
    }, [navbarRef.current]);

    const getRevealProps = (delay = 0) =>
        shouldReduceMotion
            ? {}
            : {
                initial: { opacity: 0, y: 18 },
                whileInView: { opacity: 1, y: 0 },
                viewport: { once: true, amount: 0.2 },
                transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
            }

    const trackSearchSubmit = () => {
        trackEvent(trackingEvents.CTA_SEARCH_SUBMIT_CLICK, {
            source: 'home_mobile_search_section',
            has_query: searchText ? 1 : 0,
        })
    }

    return (
        <>
            <div
                ref={navbarRef}
                style={{
                    transform: navbarVisible ? 'translateY(0)' : `translateY(-${navbarHeight}px)`,
                    transition: 'transform 0.5s ease-in-out',
                    overflow: 'hidden',
                    zIndex: 50,
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0
                }}
            >
                <Navbar />
            </div>
            <div className={cn('text-sm space-y-5', user && width < 768 ? 'mb-20' : '')}>
                <motion.section className='space-y-4 m-5' ref={searchSectionRef} {...getRevealProps(0.03)}>
                    <div className='space-y-1 '>
                        <h1 className='text-gray-500 text-[11px]'>Votre futur chez-vous grâce à Trouve Ton Nkama</h1>
                        <div className='flex text-xl font-bold text-[#146B67] items-center gap-2'>
                            <MapPin size={25} color='#146B67' />
                            <h1>
                                Rechercher sur Trouve Ton Nkama
                            </h1>
                        </div>
                    </div>
                    <Form action="/search" onSubmit={trackSearchSubmit}>
                        <div className="flex items-center border rounded-full p-2 px-4 bg-gray-100 focus-within:border-[#1FA89B]">
                            <button
                                type='submit'
                                onClick={trackSearchSubmit}
                            >
                                <Search size={25} className='hover:stroke-[#1FA89B]' />
                            </button>
                            <Input
                                className='border-none bg-transparent shadow-none focus-visible:ring-0'
                                placeholder='Logement, ville, quartier...'
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                name="query"
                            />
                            <input type="hidden" name="searchSource" value="location_maison_search_bar" />
                            <div>
                                <FilterModalHomePage />
                            </div>
                        </div>
                    </Form>
                </motion.section>

                {/* <section className='space-y-5 m-5'>
                    <h1 className='text-xl font-bold text-center text-[#146B67]'>Mettez votre logement en valeur</h1>
                    <div className='rounded-xl flex'>
                        <div className='w-2/3 bg-[#146B67] rounded-l-xl py-5 px-3 flex flex-col gap-3'>
                            <h1 className='text-xl text-white font-bold'>
                                Vous avez un logement à publier ?
                            </h1>
                            <span className='text-white'>
                                Générez des revenus passifs en publiant vos annonces immobilières !
                            </span>
                            <Link
                                href={user ? routes.protected.add_property : routes.public.signinSignup}
                                className='text-[#146B67] bg-white p-2 rounded-full text-center font-bold'
                            >
                                Publiez votre annonce
                            </Link>
                        </div>
                        <Image
                            src='assets/home-page/img-home-page.webp'
                            alt='maison-à-louer'
                            className='w-1/3 object-cover rounded-r-xl'
                            width={0}
                            height={0}
                            priority
                        />
                    </div>
                </section> */}
                <motion.div {...getRevealProps(0.05)}>
                    <FeaturedSection />
                </motion.div>

                <motion.section className='space-y-5 bg-green-50 p-5 py-16' {...getRevealProps(0.07)}>
                    <h1 className='text-xl font-bold text-center text-[#146B67]'>Quels sont vos besoins ?</h1>
                    <div className='flex gap-2'>
                        <Link
                            href={publishLink}
                            onClick={() =>
                                trackEvent(trackingEvents.CTA_HOME_PUBLISH_CLICK, {
                                    source: 'home_mobile_needs_section',
                                    destination: publishLink,
                                })
                            }
                            className='w-1/2 bg-[#146B67] text-white font-bold py-3 rounded-xl flex justify-center items-center'
                        >
                            Publier une annonce
                        </Link>
                        <Link
                            href={routes.public.search_property}
                            onClick={() =>
                                trackEvent(trackingEvents.CTA_HOME_SEARCH_CLICK, {
                                    source: 'home_mobile_needs_section',
                                    destination: routes.public.search_property,
                                })
                            }
                            className='w-1/2 bg-white border border-[#146B67] text-[#146B67] font-bold py-3 rounded-xl flex justify-center items-center text-center'
                        >
                            Rechercher une annonce
                        </Link>
                    </div>
                </motion.section>

                <motion.section className='space-y-5 p-5' {...getRevealProps(0.09)}>
                    <h1 className='text-xl text-center font-bold text-[#146B67]'>Types d'annonces</h1>
                    <CarouselPropertyType />
                </motion.section>



                <motion.section className='space-y-5' {...getRevealProps(0.11)}>
                    {/* Sections des annonces promues */}
                    <TrendingSection /> 
                    <RecentSection />
                </motion.section>

                <motion.section className='space-y-5 m-5' {...getRevealProps(0.13)}>
                    <h1 className='text-xl font-bold text-center text-[#146B67]'>Logements par province</h1>
                    <PropertyByProvince />
                </motion.section>

                <motion.section className='space-y-3 m-5 p-4 rounded-2xl border border-gray-100 bg-white' {...getRevealProps(0.14)}>
                    <h2 className='text-lg font-bold text-[#146B67]'>Recherches populaires</h2>
                    <Link href="/immobilier/location/maison" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 block">
                        Maisons à louer au Gabon
                    </Link>
                    <Link href="/immobilier/vente/maison" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 block">
                        Maisons à vendre au Gabon
                    </Link>
                    <Link href="/immobilier/location/appartement/libreville" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 block">
                        Appartements à louer à Libreville
                    </Link>
                </motion.section>

                <motion.section className='bg-green-50 py-5' {...getRevealProps(0.15)}>
                    <div className='m-5 bg-gradient-to-r to-[#146B67] from-[#1FA89B] rounded-xl py-5 px-3 flex flex-col gap-3 items-center'>
                        <h1 className='text-xl text-white font-bold text-center flex flex-col'>
                            <span>Vous recherchez</span>
                            <span>un nouveau logement ?</span>
                            <span>Parcourez notre catalogue !</span>

                        </h1>
                        <p className='text-center flex flex-col'>
                            <span className='text-white text-center'>
                                Maisons, appartements, terrains…
                            </span>
                            <span className='text-white text-center'>
                                Trouvez le bien qui vous correspond
                            </span>
                            <span className='text-white text-center'>
                                en toute simplicité.
                            </span>
                        </p>

                        <Link
                            href={routes.public.search_property}
                            onClick={() =>
                                trackEvent(trackingEvents.CTA_HOME_EXPLORE_CLICK, {
                                    source: 'home_mobile_bottom_section',
                                    destination: routes.public.search_property,
                                })
                            }
                            className='text-[#146B67] bg-white p-2 rounded-full text-center font-bold w-1/3'
                        >
                            Explorez
                        </Link>
                    </div>
                </motion.section>
            </div>
        </>

    )
}
