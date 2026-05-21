"use client";

import { motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";
import { FiInstagram } from "react-icons/fi";

const services = [
  {
    title: "藝術體驗與工作坊",
    description: "療癒繪畫、流體藝術與正念手作，為忙碌的生活提供喘息的空間與自我探索的時光。",
  },
  {
    title: "客製化藝術委託",
    description: "專屬個人畫像、紀念日掛畫或品牌視覺插畫，將您的故事轉化為獨一無二的藝術品。",
  },
  {
    title: "策展與跨界企劃",
    description: "微型藝術聯展、空間美學佈置與地方社區推廣，將藝術美感延伸至日常的每個角落。",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white relative selection:bg-black selection:text-white">

      {/* Navigation */}
      <nav className="fixed w-full z-50 flex items-center justify-between px-8 py-8 mix-blend-difference text-white">
        <div className="text-sm tracking-widest font-semibold">
          find the way
        </div>
        <div className="hidden md:flex gap-10 text-[13px] tracking-[0.15em] lowercase">
          <a href="#work" className="hover:opacity-50 transition-opacity">work</a>
          <a href="#about" className="hover:opacity-50 transition-opacity">about</a>
          <a href="#services" className="hover:opacity-50 transition-opacity">services</a>
          <a href="#contact" className="hover:opacity-50 transition-opacity">contact</a>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:opacity-50 transition-opacity"><FiInstagram className="w-4 h-4" /></a>
          <a href="#" className="hover:opacity-50 transition-opacity"><Mail className="w-4 h-4" /></a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center h-[100vh] px-4 text-center bg-[#f2f2f2] overflow-hidden">
        {/* Grainy Noise Background */}
        <div className="noise-overlay"></div>
        
        {/* Moving clouds effect (subtle) */}
        <motion.div 
          animate={{ x: [0, -100, 0] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] left-[10%] w-[80vw] h-[80vw] rounded-full bg-white/20 blur-[100px] pointer-events-none"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl relative z-10"
        >
          <h1 className="font-sans text-5xl md:text-6xl lg:text-[80px] font-medium leading-tight tracking-tight text-black mb-8 uppercase">
            Find the Way<br/>Art Studio
          </h1>
          <p className="font-serif text-lg md:text-2xl tracking-[0.3em] text-black mb-12">
            忙 碌 不 迷 路
          </p>
          <p className="max-w-xl mx-auto text-black text-sm md:text-base tracking-widest font-light leading-loose mb-16">
            experience life with changeable senses.<br/>
            crafting bespoke art and visual storytelling.
          </p>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <a href="#about" className="group flex items-center gap-3 bg-transparent text-black border border-black px-8 py-3 rounded-full text-xs tracking-[0.2em] uppercase hover:bg-black hover:text-white transition-all duration-300">
              About Studio
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </motion.div>

        {/* The Curved Transition Arc at the bottom of hero */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[80px] md:h-[120px]">
            <path d="M0,120 C400,0 800,0 1200,120 Z" fill="#ffffff"></path>
          </svg>
        </div>
      </main>

      {/* Services Section */}
      <section id="services" className="relative z-10 px-8 py-32 bg-white text-black min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-32 flex flex-col items-center md:items-start"
          >
            <h2 className="font-serif text-4xl md:text-5xl tracking-[0.2em] mb-4">服務項目</h2>
            <p className="text-black tracking-[0.3em] uppercase text-xs">Services</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 lg:gap-16">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col border-t border-black/10 pt-8"
              >
                <div className="text-xs tracking-[0.2em] text-black/40 mb-6 font-mono">0{index + 1}</div>
                <h3 className="text-xl font-medium tracking-[0.1em] mb-6">{service.title}</h3>
                <p className="text-black/60 leading-[2] font-light text-sm tracking-wide">
                  {service.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
