import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Plus, Trash2, X, Image as ImageIcon, Send, ExternalLink, Settings } from 'lucide-react';
import { Screenshot } from './types.ts';

const ADMIN_CODE = "723424";
const WHATSAPP_LINK = "https://wa.me/+923000000000"; // User can change this or I can add a field

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [whatsappLink, setWhatsappLink] = useState("https://wa.me/+923000000000");
  const [newScreenshot, setNewScreenshot] = useState({ title: '', description: '', url: '' });
  const [isUploading, setIsUploading] = useState(false);

  const IMGBB_API_KEY = "a61f78ce57584c52be3bf12d8b3e7109";

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('betpro_screenshots');
    if (saved) {
      setScreenshots(JSON.parse(saved));
    }
    const savedWA = localStorage.getItem('betpro_whatsapp');
    if (savedWA) {
      setWhatsappLink(savedWA);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setNewScreenshot(prev => ({ ...prev, url: data.data.url }));
      } else {
        alert("Upload failed. Please check your API key or image format.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading image.");
    } finally {
      setIsUploading(false);
    }
  };

  const saveScreenshots = (data: Screenshot[]) => {
    setScreenshots(data);
    localStorage.setItem('betpro_screenshots', JSON.stringify(data));
  };

  const handleGlobalClick = (e: React.MouseEvent) => {
    // If it's a click on something that isn't interactive, go to WhatsApp
    const target = e.target as HTMLElement;
    if (
      target.closest('.interactive') ||
      target.closest('.admin-element')
    ) {
      return;
    }
    window.open(whatsappLink, '_blank');
  };

  const handleUnlock = () => {
    const code = prompt("Enter Admin Code:");
    if (code === ADMIN_CODE) {
      setIsAdmin(true);
      setShowAdminPanel(true);
    } else if (code !== null) {
      alert("Invalid Code");
    }
  };

  const addScreenshot = () => {
    if (!newScreenshot.url || !newScreenshot.title) return;
    
    const newItem: Screenshot = {
      id: Date.now().toString(),
      url: newScreenshot.url,
      title: newScreenshot.title,
      description: newScreenshot.description,
      createdAt: Date.now(),
    };

    saveScreenshots([newItem, ...screenshots]);
    setNewScreenshot({ title: '', description: '', url: '' });
  };

  const deleteScreenshot = (id: string) => {
    saveScreenshots(screenshots.filter(s => s.id !== id));
  };

  return (
    <div 
      className="min-h-screen bg-black flex flex-col cursor-pointer"
      onClick={handleGlobalClick}
    >
      {/* Header */}
      <header className="py-8 px-6 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center">
              <span className="text-black font-bold text-xl">B</span>
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight gold-text">
              BETPRO <span className="text-white font-light text-sm italic ml-1">Official</span>
            </h1>
          </motion.div>

          <a 
            href={whatsappLink} 
            target="_blank" 
            className="interactive px-6 py-2 bg-gold-500 text-black font-bold rounded-full hover:bg-gold-400 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(196,150,44,0.3)]"
          >
            JOIN NOW <Send size={18} />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-1 rounded-full border border-gold-500/30 text-gold-500 text-xs font-bold tracking-widest mb-6 uppercase"
          >
            Verified Winning Strategies
          </motion.div>
          <h2 className="text-5xl md:text-7xl font-serif font-bold mb-6 gold-text">
            Premium Trading Experience
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto font-light leading-relaxed mb-8">
            Experience the most reliable and secure betting platform. 
            Real wins, instant payments, and 24/7 support.
          </p>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-neutral-900/50 border border-gold-500/20 p-8 rounded-[2.5rem] max-w-3xl mx-auto backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="text-8xl font-serif italic text-gold-500">30%</span>
            </div>
            <p className="text-2xl md:text-3xl font-serif leading-tight text-white mb-4">
              Agr aap jeetna chahte hen to Hume <span className="gold-text font-bold">join kren</span>
            </p>
            <p className="text-gold-400 text-xl font-light italic">
              30% commission pe lakhon jitne ka Mauka payen!
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <div className="h-1 w-20 bg-gold-500 rounded-full" />
              <div className="h-1 w-12 bg-white/10 rounded-full" />
              <div className="h-1 w-8 bg-white/10 rounded-full" />
            </div>
          </motion.div>
        </motion.div>

        {/* Screenshot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {screenshots.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
              <ImageIcon className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-500 italic">No screenshots uploaded yet.</p>
            </div>
          ) : (
            screenshots.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="interactive group relative bg-neutral-900 rounded-3xl overflow-hidden border border-white/5 hover:border-gold-500/50 transition-all shadow-xl"
              >
                <div className="aspect-[9/16] overflow-hidden relative">
                  <img 
                    src={s.url} 
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                </div>
                <div className="p-6 absolute bottom-0 left-0 right-0">
                  <h3 className="text-xl font-bold text-gold-200 mb-1">{s.title}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">{s.description}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-neutral-950 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="gold-text font-serif text-2xl font-bold mb-2 italic">BETPRO</h3>
            <p className="text-gray-600 text-sm">© 2026 Premium Gaming Solutions. All rights reserved.</p>
          </div>
          
          <div className="flex items-center gap-6 text-gray-500">
            <a href="#" className="hover:text-gold-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gold-500 transition-colors">Terms</a>
            <button 
              onClick={handleUnlock}
              className="admin-element opacity-20 hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-white/5"
              title="Admin"
            >
              <Lock size={16} />
            </button>
          </div>
        </div>
      </footer>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl admin-element"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-neutral-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-gold-500/30 p-8 shadow-[0_0_50px_rgba(196,150,44,0.1)]"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-serif font-bold gold-text flex items-center gap-3">
                    <Settings /> Admin Panel
                  </h2>
                  <p className="text-gray-500 text-sm">Manage your Betpro landing page</p>
                </div>
                <button 
                  onClick={() => setShowAdminPanel(false)}
                  className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X />
                </button>
              </div>

              {/* Global Settings */}
              <section className="mb-12 p-6 bg-black/30 rounded-3xl border border-white/5">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                  <ExternalLink size={20} className="text-gold-500" /> Page Settings
                </h3>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-500 uppercase tracking-widest px-1">WhatsApp Redirect Link</label>
                  <input 
                    type="text" 
                    placeholder="https://wa.me/..." 
                    className="bg-black/50 border border-white/10 rounded-xl p-3 focus:border-gold-500/50 outline-none transition-all text-white w-full"
                    value={whatsappLink}
                    onChange={(e) => {
                      setWhatsappLink(e.target.value);
                      localStorage.setItem('betpro_whatsapp', e.target.value);
                    }}
                  />
                </div>
              </section>

              {/* Upload Section */}
              <section className="mb-12">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                  <Plus size={20} className="text-gold-500" /> Add New Screenshot
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Select Screenshot File</label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={isUploading}
                      />
                      <div className={`border-2 border-dashed ${isUploading ? 'border-gold-500/50 bg-gold-500/5' : 'border-white/10 bg-black/50'} rounded-2xl p-8 flex flex-col items-center justify-center transition-all group-hover:border-gold-500/30`}>
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-gold-500 text-sm font-medium">Uploading to ImgBB...</p>
                          </div>
                        ) : newScreenshot.url ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={newScreenshot.url} className="w-20 h-20 object-cover rounded-lg border border-gold-500/50" />
                            <p className="text-green-500 text-sm">Image Uploaded Successfully!</p>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="text-gray-600 mb-2" size={32} />
                            <p className="text-gray-400 text-sm italic">Click or drag image to upload</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <input 
                    type="text" 
                    placeholder="Title (e.g., Big Win Today)" 
                    className="bg-black/50 border border-white/10 rounded-xl p-3 focus:border-gold-500/50 outline-none transition-all text-white"
                    value={newScreenshot.title}
                    onChange={(e) => setNewScreenshot({...newScreenshot, title: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Image URL (Auto-filled on upload)" 
                    className="bg-black/50 border border-white/10 rounded-xl p-3 focus:border-gold-500/50 outline-none transition-all text-white opacity-50"
                    value={newScreenshot.url}
                    readOnly
                  />
                  <textarea 
                    placeholder="Description (Optional details)" 
                    className="bg-black/50 border border-white/10 rounded-xl p-3 focus:border-gold-500/50 outline-none transition-all text-white md:col-span-2 min-h-[100px]"
                    value={newScreenshot.description}
                    onChange={(e) => setNewScreenshot({...newScreenshot, description: e.target.value})}
                  />
                  <button 
                    onClick={addScreenshot}
                    disabled={isUploading || !newScreenshot.url || !newScreenshot.title}
                    className="md:col-span-2 py-4 bg-gold-500 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold rounded-xl hover:bg-gold-400 transition-all flex items-center justify-center gap-2"
                  >
                    {isUploading ? 'PLEASE WAIT...' : 'PUBLISH TO HOME PAGE'} <Send size={18} />
                  </button>
                </div>
              </section>

              {/* Manage Section */}
              <section>
                <h3 className="text-lg font-bold mb-4 text-white">Live Content List</h3>
                <div className="space-y-4">
                  {screenshots.map(s => (
                    <div key={s.id} className="flex gap-4 p-4 bg-black/40 rounded-2xl border border-white/5 items-center">
                      <img src={s.url} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gold-300">{s.title}</h4>
                        <p className="text-gray-500 text-xs line-clamp-1">{s.description}</p>
                      </div>
                      <button 
                        onClick={() => deleteScreenshot(s.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  {screenshots.length === 0 && (
                    <p className="text-gray-600 italic py-8 text-center bg-black/20 rounded-2xl border border-dashed border-white/5">
                      No live items found.
                    </p>
                  )}
                </div>
              </section>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
