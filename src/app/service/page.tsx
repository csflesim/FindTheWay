"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { FiInstagram } from "react-icons/fi";

const services = [
  {
    title: "藝術體驗與工作坊 Art Workshops",
    items: [
      "療癒繪畫 (Healing Painting)",
      "流體藝術 (Fluid Art)",
      "正念手作 (Mindfulness Craft)",
      "企業包班 (Corporate Team Building)",
      "週末主題課 (Weekend Themed Workshop)",
    ]
  },
  {
    title: "客製化藝術委託 Custom Art",
    items: [
      "個人化畫像訂製 (Portrait Commission)",
      "紀念日掛畫 (Anniversary Art)",
      "品牌視覺插畫 (Brand Illustration)",
      "特色禮盒設計 (Gift Box Design)",
    ]
  },
  {
    title: "策展與跨界企劃 Curation & Projects",
    items: [
      "微型藝術聯展 (Mini Exhibition)",
      "空間美學佈置 (Spatial Aesthetics)",
      "商業壁畫創作 (Commercial Murals)",
      "地方社區推廣 (Community Art)",
    ]
  },
];

const processes = [
  { step: "01", title: "需求 Need", desc: "傾聽您的故事，確認創作需求與目標。" },
  { step: "02", title: "策略 Strategy", desc: "提出專屬的藝術方案與美學定位建議。" },
  { step: "03", title: "創作 Create", desc: "進入藝術創作階段，定期回報進度。" },
  { step: "04", title: "交付 Deliver", desc: "完成作品，提供完善的包裝或佈展服務。" },
];

export default function ServicePage() {
  return (
    <div className="min-h-screen bg-white relative selection:bg-black selection:text-white pb-32">
      {/* Navigation (Black Text for inner pages) */}
      <nav className="w-full flex items-center justify-between px-8 py-8 text-black">
        <a href="/" className="text-sm tracking-widest font-semibold hover:opacity-50 transition-opacity">
          find the way
        </a>
        <div className="hidden md:flex gap-10 text-[13px] tracking-[0.15em] lowercase">
          <a href="/#work" className="hover:opacity-50 transition-opacity">work</a>
          <a href="/about" className="hover:opacity-50 transition-opacity">about</a>
          <a href="/service" className="opacity-50 pointer-events-none">services</a>
          <a href="/#contact" className="hover:opacity-50 transition-opacity">contact</a>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:opacity-50 transition-opacity"><FiInstagram className="w-4 h-4" /></a>
          <a href="#" className="hover:opacity-50 transition-opacity"><Mail className="w-4 h-4" /></a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-8 pt-20">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-32"
        >
          <p className="max-w-2xl text-black/80 leading-loose tracking-wide font-light md:text-lg mb-12">
            預見並引導觀者的情感與反應，是我們的專業；<br/>
            而同理與換位思考，更是我們最重視的核心價值。
          </p>
          <p className="max-w-2xl text-black/60 leading-relaxed font-light text-sm tracking-wide">
            我們關注真正能帶來正面效益的需求。無論您是需要一場療癒心靈的工作坊，或是為品牌量身打造專屬的藝術視覺，我們都將細心聆聽、深度溝通，確保每一步都朝著清晰的方向前進。歡迎與我們聊聊，讓這場藝術之旅從對話開始。
          </p>
        </motion.div>

        {/* Services List */}
        <div className="mb-40">
          <h2 className="text-sm tracking-[0.3em] uppercase text-black/40 mb-16 font-medium">Service</h2>
          
          <div className="flex flex-col">
            {services.map((service, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8 }}
                className="flex flex-col md:flex-row py-12 border-t border-black/10 group"
              >
                <div className="md:w-1/3 mb-6 md:mb-0">
                  <h3 className="text-xl font-medium tracking-[0.15em]">{service.title.split(' ')[0]}</h3>
                  <p className="text-xs tracking-widest text-black/40 mt-2 font-mono uppercase">{service.title.split(' ').slice(1).join(' ')}</p>
                </div>
                <div className="md:w-2/3 flex flex-wrap gap-x-8 gap-y-4">
                  {service.items.map((item, i) => (
                    <span key={i} className="text-sm font-light tracking-wide text-black/70">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Process */}
        <div>
          <h2 className="text-sm tracking-[0.3em] uppercase text-black/40 mb-16 font-medium">Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {processes.map((process, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex flex-col"
              >
                <span className="text-xs font-mono text-black/40 mb-6">{process.step}</span>
                <h4 className="text-lg font-medium tracking-widest mb-4">{process.title.split(' ')[0]}</h4>
                <p className="text-sm text-black/60 font-light leading-relaxed tracking-wide">
                  {process.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
