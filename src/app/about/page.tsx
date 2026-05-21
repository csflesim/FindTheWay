"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { FiInstagram } from "react-icons/fi";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f2f2f2] relative selection:bg-black selection:text-white pb-32">
      {/* Noise Background for About */}
      <div className="noise-overlay opacity-30"></div>

      {/* Navigation */}
      <nav className="w-full flex items-center justify-between px-8 py-8 text-black relative z-50">
        <a href="/" className="text-sm tracking-widest font-semibold hover:opacity-50 transition-opacity">
          find the way
        </a>
        <div className="hidden md:flex gap-10 text-[13px] tracking-[0.15em] lowercase">
          <a href="/#work" className="hover:opacity-50 transition-opacity">work</a>
          <a href="/about" className="opacity-50 pointer-events-none">about</a>
          <a href="/service" className="hover:opacity-50 transition-opacity">services</a>
          <a href="/#contact" className="hover:opacity-50 transition-opacity">contact</a>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:opacity-50 transition-opacity"><FiInstagram className="w-4 h-4" /></a>
          <a href="#" className="hover:opacity-50 transition-opacity"><Mail className="w-4 h-4" /></a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 pt-20 relative z-10">
        
        {/* Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-24 text-center md:text-left"
        >
          <p className="text-xs tracking-[0.4em] uppercase text-black/50 mb-6 font-mono">
            About Find The Way
          </p>
          <h1 className="font-serif text-3xl md:text-5xl tracking-[0.15em] leading-relaxed">
            向藝術學習以寧靜的姿態擁抱生活，<br className="hidden md:block"/>
            在忙碌的步調中，找回心的方向。
          </h1>
        </motion.div>

        {/* Content Blocks */}
        <div className="flex flex-col gap-32">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="grid md:grid-cols-2 gap-12"
          >
            <div>
              <h2 className="text-sm tracking-[0.3em] font-medium mb-6">品牌願景 VISION</h2>
            </div>
            <div>
              <p className="text-sm font-light leading-[2.2] tracking-wide text-black/80">
                在這個瞬息萬變、資訊爆炸的時代，我們時常感到焦慮與迷失。「忙碌不迷路藝術工作坊」希望能成為都市裡的一座綠洲。我們不僅關注藝術技巧的傳遞，更重視每一次創作過程中的自我對話。透過視覺藝術的力量，為每一位參與者或品牌，打造最適切的視覺想像與心靈棲地。
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="grid md:grid-cols-2 gap-12"
          >
            <div>
              <h2 className="text-sm tracking-[0.3em] font-medium mb-6">核心價值 VALUES</h2>
            </div>
            <div className="flex flex-col gap-8">
              <div>
                <h3 className="font-medium tracking-widest mb-2">傾聽 Listening</h3>
                <p className="text-sm font-light leading-[1.8] text-black/70">
                  創作不是只憑個人想法，而是傾聽內在的聲音與客戶的真實需求。透過同理，才能找到既美又具意義的解決方案。
                </p>
              </div>
              <div>
                <h3 className="font-medium tracking-widest mb-2">療癒 Healing</h3>
                <p className="text-sm font-light leading-[1.8] text-black/70">
                  每次下筆都是一種釋放。我們相信藝術具備轉化情緒的力量，將日常的挑戰化為畫布上的養分。
                </p>
              </div>
              <div>
                <h3 className="font-medium tracking-widest mb-2">真實 Authenticity</h3>
                <p className="text-sm font-light leading-[1.8] text-black/70">
                  真實回應每一個情感。讓作品兼具美學張力與情感共鳴，這才是藝術最打動人心的力量。
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
