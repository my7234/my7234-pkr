import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Plus, Trash2, X, Image as ImageIcon, Send, ExternalLink, Settings } from 'lucide-react';
import { Screenshot, Category } from './types.ts';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc, 
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { auth } from './firebase';

const ADMIN_CODE = "723424";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (errInfo.error.includes('offline')) {
    console.warn("Firestore client is offline. This usually means the project configuration matches but the database might not be initialized or accessible from this network.");
  }
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [whatsappLink, setWhatsappLink] = useState("https://wa.me/923197139789");
  const [newScreenshot, setNewScreenshot] = useState({ title: '', description: '', url: '', category: 'screenshot' as Category });
  const [activeCategory, setActiveCategory] = useState<Category>('screenshot');
  const [isUploading, setIsUploading] = useState(false);
  const [pin, setPin] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);

  const IMGBB_API_KEY = "a61f78ce57584c52be3bf12d8b3e7109";

  const [isOffline, setIsOffline] = useState(false);

  // Load from Firestore & LocalStorage Backup
  useEffect(() => {
    // 1. Pehle local storage se load kren
    const localSaved = localStorage.getItem('proman_screenshots_backup');
    if (localSaved) {
      try {
        setScreenshots(JSON.parse(localSaved));
      } catch (e) {
        console.error("Local storage error");
      }
    }

    const localWA = localStorage.getItem('proman_whatsapp_backup');
    if (localWA) {
      setWhatsappLink(localWA);
    }

    // 2. Firestore Listen
    const q = query(collection(db, 'screenshots'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsOffline(false);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Screenshot[];
      
      setScreenshots(items);
      localStorage.setItem('proman_screenshots_backup', JSON.stringify(items));
    }, (error) => {
      console.error("Firestore Sync Error:", error);
      if (error.message.includes('offline')) {
        setIsOffline(true);
      } else {
        // Index issue ya permissions issue dikhane ke liye alert
        console.warn("Possible Firestore Error (Check Console for Link):", error.message);
      }
    });

    return () => unsubscribe();
  }, []);

  // WhatsApp link Load
  useEffect(() => {
    const loadWA = async () => {
      try {
        const waDoc = await getDoc(doc(db, 'settings', 'whatsapp'));
        if (waDoc.exists()) {
          const link = waDoc.data().link;
          setWhatsappLink(link);
          localStorage.setItem('proman_whatsapp_backup', link);
        }
      } catch (error) {
        console.log("WA Load Offline");
      }
    };
    loadWA();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetCategory?: Category) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (targetCategory) setActiveCategory(targetCategory);
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
        setNewScreenshot(prev => ({ ...prev, url: data.data.url, category: targetCategory || prev.category }));
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

  const updateWhatsappLink = async (link: string) => {
    // Normalize number if user only enters digits
    let formattedLink = link;
    if (link.match(/^\d+$/)) {
      formattedLink = `https://wa.me/${link}`;
    }
    setWhatsappLink(formattedLink);
    try {
      await setDoc(doc(db, 'settings', 'whatsapp'), { link: formattedLink });
      localStorage.setItem('proman_whatsapp_backup', formattedLink);
    } catch (err) {
      console.error("Save Error:", err);
    }
  };

  const handleGlobalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Header, Footer aur Admin elements ko chorr kar poore page pe click allow kren
    if (
      target.closest('header') ||
      target.closest('footer') ||
      target.closest('.admin-element') ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }
    if (whatsappLink) {
      window.open(whatsappLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_CODE) {
      setIsAdmin(true);
      setShowAdminPanel(true);
      setShowPinInput(false);
      setPin("");
    } else {
      alert("Invalid Code");
      setPin("");
    }
  };

  const addScreenshot = async () => {
    if (!newScreenshot.url || !newScreenshot.title) return;
    
    // Optimistic Update for Local Backup
    const tempId = Date.now().toString();
    const newItem: Screenshot = {
      id: tempId,
      url: newScreenshot.url,
      title: newScreenshot.title,
      description: newScreenshot.description,
      createdAt: Date.now(),
      category: newScreenshot.category,
    };
    const updatedScreenshots = [newItem, ...screenshots];
    localStorage.setItem('proman_screenshots_backup', JSON.stringify(updatedScreenshots));

    try {
      await addDoc(collection(db, 'screenshots'), {
        url: newScreenshot.url,
        title: newScreenshot.title,
        description: newScreenshot.description,
        createdAt: Date.now(),
        category: newScreenshot.category,
      });
      alert("Online Save Ho Gya Hai!");
      setNewScreenshot({ title: '', description: '', url: '', category: 'screenshot' });
    } catch (err) {
      if (err instanceof Error && err.message.includes('offline')) {
        console.warn("Saving to local storage only (Firestore is offline)");
        setScreenshots(updatedScreenshots);
        setNewScreenshot({ title: '', description: '', url: '', category: 'screenshot' });
        setIsOffline(true);
      } else {
        handleFirestoreError(err, OperationType.CREATE, 'screenshots');
      }
    }
  };

  const deleteScreenshot = async (id: string) => {
    const updatedList = screenshots.filter(s => s.id !== id);
    setScreenshots(updatedList);
    localStorage.setItem('proman_screenshots_backup', JSON.stringify(updatedList));

    try {
      await deleteDoc(doc(db, 'screenshots', id));
    } catch (err) {
      if (err instanceof Error && err.message.includes('offline')) {
        setIsOffline(true);
      } else {
        handleFirestoreError(err, OperationType.DELETE, `screenshots/${id}`);
      }
    }
  };

  const racingItems = screenshots.filter(s => s.category === 'racing');
  const screenshotItems = screenshots.filter(s => s.category === 'screenshot');

  return (
    <div 
      className="min-h-screen bg-black flex flex-col cursor-pointer overflow-x-hidden"
      onClick={handleGlobalClick}
    >
      {isOffline && (
        <div className="bg-red-500 text-white text-[10px] md:text-sm text-center py-2 font-bold z-[100] sticky top-0 shadow-lg">
          DATABASE CONNECT NAHI HO RAHA - IMAGES TEMPORARY SAVE HAIN
        </div>
      )}
      {/* Header */}
      <header className="py-4 md:py-8 px-4 md:px-6 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 md:gap-3 shrink"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gold-500 flex items-center justify-center shrink-0">
              <span className="text-black font-bold text-lg md:text-xl">B</span>
            </div>
            <h1 className="flex flex-col min-w-0">
              <span className="font-serif text-xl md:text-3xl font-bold tracking-tighter gold-text leading-none uppercase truncate">PRO MAN</span>
              <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-white/40 font-bold ml-0.5 whitespace-nowrap">Premium Trading</span>
            </h1>
            <div className="hidden sm:block px-2 py-0.5 rounded-md border border-gold-500/30 bg-gold-500/5 backdrop-blur-sm shrink-0">
              <span className="text-[9px] font-bold text-gold-500 tracking-widest uppercase">Official</span>
            </div>
          </motion.div>

          <a 
            href={whatsappLink} 
            target="_blank" 
            className="interactive px-4 md:px-6 py-2 bg-gold-500 text-black text-sm md:text-base font-bold rounded-full hover:bg-gold-400 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(196,150,44,0.3)] whitespace-nowrap shrink-0"
          >
            JOIN <span className="hidden xs:inline">NOW</span> <Send size={16} />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-8 md:py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 md:mb-16"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-3 py-1 rounded-full border border-gold-500/30 text-gold-500 text-[10px] md:text-xs font-bold tracking-widest mb-4 md:mb-6 uppercase"
          >
            Verified Winning Strategies
          </motion.div>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold mb-4 md:mb-6 gold-text leading-tight px-2">
            Premium Trading Experience
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto font-light leading-relaxed mb-6 md:mb-8 px-4">
            Experience the most reliable and secure betting platform. 
            Real wins, instant payments, and 24/7 support.
          </p>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-neutral-900/50 border border-gold-500/20 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] max-w-3xl mx-auto backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 pointer-events-none">
              <span className="text-6xl md:text-8xl font-serif italic text-gold-500">30%</span>
            </div>
            <p className="text-xl md:text-3xl font-serif leading-tight text-white mb-3 md:mb-4 relative z-10">
              Agr aap jeetna chahte hen to Hume <span className="gold-text font-bold">join kren</span>
            </p>
            <p className="text-gold-400 text-lg md:text-xl font-light italic relative z-10">
              30% commission pe lakhon jitne ka Mauka payen!
            </p>
            <div className="mt-6 md:mt-8 flex justify-center gap-2 md:gap-4 relative z-10">
              <div className="h-1 w-12 md:w-20 bg-gold-500 rounded-full" />
              <div className="h-1 w-8 md:w-12 bg-white/10 rounded-full" />
              <div className="h-1 w-6 md:w-8 bg-white/10 rounded-full" />
            </div>
          </motion.div>
        </motion.div>

        {/* Racing Section */}
        {racingItems.length > 0 && (
          <section className="mb-20">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 mb-8"
            >
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/30" />
              <h2 className="text-3xl font-serif font-bold gold-text">Greyhound & Horse Racing</h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/30" />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {racingItems.map((s, idx) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="interactive group relative aspect-video rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-gold-500/20 shadow-[0_0_30px_rgba(196,150,44,0.1)]"
                >
                  <img 
                    src={s.url} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  
                  {/* Animation elements */}
                  <div className="absolute top-3 left-3 md:top-4 md:left-4 flex gap-2">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 shadow-[0_0_10px_red]"
                    />
                    <span className="text-[8px] md:text-[10px] font-bold text-white uppercase tracking-widest bg-red-500/80 px-2 rounded">Live Racing</span>
                  </div>

                  <div className="absolute bottom-0 left-0 p-4 md:p-8 w-full">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 line-clamp-1">{s.title}</h3>
                    <p className="text-gold-300 font-medium text-[10px] md:text-sm italic line-clamp-1">{s.description}</p>
                  </div>

                  {/* Animated Overlay for "Movement" */}
                  <motion.div 
                    animate={{ x: ['100%', '-100%'] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <h2 className="text-2xl font-serif font-bold text-white/50">Recent Wins & Proof</h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </motion.div>

        {/* Screenshot Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pb-12 md:pb-20">
          {screenshotItems.length === 0 ? (
            <div className="col-span-full py-12 md:py-20 text-center border-2 border-dashed border-white/10 rounded-2xl md:rounded-3xl">
              <ImageIcon className="mx-auto mb-4 text-gray-600" size={40} md:size={48} />
              <p className="text-gray-500 italic text-sm">No winning proof uploaded yet.</p>
            </div>
          ) : (
            screenshotItems.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="interactive group relative bg-neutral-900 rounded-2xl md:rounded-3xl overflow-hidden border border-white/5 hover:border-gold-500/50 transition-all shadow-xl"
              >
                <div className="relative group/img overflow-hidden">
                  <img 
                    src={s.url} 
                    alt={s.title}
                    className="w-full h-auto min-h-[200px] object-cover sm:object-contain bg-black transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover/img:opacity-40 transition-opacity" />
                </div>
                <div className="p-4 md:p-6 absolute bottom-0 left-0 right-0">
                  <h3 className="text-lg md:text-xl font-bold text-gold-200 mb-0.5 md:mb-1">{s.title}</h3>
                  <p className="text-gray-400 text-xs md:text-sm line-clamp-2">{s.description}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-neutral-950 mt-auto relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="gold-text font-serif text-2xl font-bold mb-2 italic uppercase">PRO MAN</h3>
            <p className="text-gray-600 text-sm">© 2026 Premium Gaming Solutions. All rights reserved.</p>
          </div>
          
          <div className="flex items-center gap-6 text-gray-500 relative">
            <a href="#" className="hover:text-gold-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gold-500 transition-colors">Terms</a>
            
            <AnimatePresence>
              {showPinInput && (
                <motion.form 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onSubmit={handleUnlockSubmit}
                  className="absolute bottom-full right-0 mb-4 flex gap-2 bg-neutral-900 p-3 rounded-2xl border border-gold-500/30 shadow-2xl admin-element z-50 min-w-[160px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input 
                    autoFocus
                    type="password" 
                    placeholder="PIN" 
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-gold-500/50 text-white"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                  <button type="submit" className="bg-gold-500 text-black px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap">UNLOCK</button>
                </motion.form>
              )}
            </AnimatePresence>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowPinInput(!showPinInput);
              }}
              className="admin-element opacity-[0.03] hover:opacity-100 transition-all p-3 rounded-xl border border-white/5 hover:bg-gold-500/10 hover:border-gold-500/20 relative z-50 group hover:scale-110"
              title="Admin Access"
            >
              <Lock size={14} className="text-white group-hover:text-gold-500 transition-colors" />
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
            className="bg-neutral-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl md:rounded-[2rem] border border-gold-500/30 p-4 md:p-8 shadow-[0_0_50px_rgba(196,150,44,0.1)] mx-2"
          >
            <div className="flex justify-between items-center mb-6 md:mb-8">
                <div>
                  <h2 className="text-xl md:text-3xl font-serif font-bold gold-text flex items-center gap-2 md:gap-3">
                    <Settings className="w-5 h-5 md:w-8 md:h-8" /> Admin Panel
                  </h2>
                  <p className="text-gray-500 text-[10px] md:text-sm">Manage your Pro Man page</p>
                </div>
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="p-2 md:p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Global Settings */}
            <section className="mb-8 md:mb-12 p-4 md:p-6 bg-black/30 rounded-2xl md:rounded-3xl border border-white/5">
              <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-white">
                <ExternalLink size={18} md:size={20} className="text-gold-500" /> Page Settings
              </h3>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest px-1">WhatsApp Redirect Link</label>
                <input 
                  type="text" 
                  placeholder="https://wa.me/..." 
                  className="bg-black/50 border border-white/10 rounded-xl p-2.5 md:p-3 focus:border-gold-500/50 outline-none transition-all text-white w-full text-sm"
                  value={whatsappLink}
                  onChange={(e) => {
                    updateWhatsappLink(e.target.value);
                  }}
                />
              </div>
            </section>

            {/* Racing Upload Section */}
            <section className="mb-8 md:mb-12 p-4 md:p-6 bg-gold-500/5 rounded-2xl md:rounded-3xl border border-gold-500/20">
              <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-white">
                <Plus size={18} md:size={20} className="text-gold-500" /> Racing Content
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Racing Image (Dog/Horse)</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'racing')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={isUploading}
                    />
                    <div className={`border-2 border-dashed ${isUploading && activeCategory === 'racing' ? 'border-gold-500/50 bg-gold-500/5' : 'border-white/10 bg-black/50'} rounded-xl md:rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center transition-all`}>
                      {isUploading && activeCategory === 'racing' ? (
                        <div className="flex flex-col items-center gap-2 md:gap-3">
                          <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-gold-500 text-[10px] md:text-sm font-medium">Uploading...</p>
                        </div>
                      ) : newScreenshot.url && newScreenshot.category === 'racing' ? (
                        <div className="flex flex-col items-center gap-2">
                          <img src={newScreenshot.url} className="w-12 h-12 md:w-20 md:h-20 object-cover rounded-lg border border-gold-500/50" />
                          <p className="text-green-500 text-[10px] md:text-sm">Ready!</p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="text-gray-600 mb-2" size={24} md:size={32} />
                          <p className="text-gray-400 text-[10px] md:text-sm italic text-center">Click to upload Dog/Horse Image</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Racing Title" 
                  className="bg-black/50 border border-white/10 rounded-xl p-2.5 md:p-3 focus:border-gold-500/50 outline-none transition-all text-white text-sm"
                  value={activeCategory === 'racing' ? newScreenshot.title : ''}
                  onChange={(e) => setNewScreenshot({...newScreenshot, title: e.target.value, category: 'racing'})}
                />
                <input 
                  type="text" 
                  placeholder="Subtitle" 
                  className="bg-black/50 border border-white/10 rounded-xl p-2.5 md:p-3 focus:border-gold-500/50 outline-none transition-all text-white text-sm"
                  value={activeCategory === 'racing' ? newScreenshot.description : ''}
                  onChange={(e) => setNewScreenshot({...newScreenshot, description: e.target.value, category: 'racing'})}
                />
                <button 
                  onClick={addScreenshot}
                  disabled={isUploading || !newScreenshot.url || newScreenshot.category !== 'racing'}
                  className="md:col-span-2 py-3 md:py-4 bg-gold-500 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold rounded-xl hover:bg-gold-400 transition-all text-sm md:text-base"
                >
                  ADD RACING CONTENT
                </button>
              </div>
            </section>

            {/* Upload Section */}
            <section className="mb-8 md:mb-12">
              <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2 text-white">
                <Plus size={18} md:size={20} className="text-gold-500" /> Professional Screenshots
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Screenshot File</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'screenshot')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={isUploading}
                    />
                    <div className={`border-2 border-dashed ${isUploading && activeCategory === 'screenshot' ? 'border-gold-500/50 bg-gold-500/5' : 'border-white/10 bg-black/50'} rounded-xl md:rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center transition-all group-hover:border-gold-500/30`}>
                      {isUploading && activeCategory === 'screenshot' ? (
                        <div className="flex flex-col items-center gap-2 md:gap-3">
                          <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-gold-500 text-[10px] md:text-sm font-medium text-center">Uploading...</p>
                        </div>
                      ) : newScreenshot.url && newScreenshot.category === 'screenshot' ? (
                        <div className="flex flex-col items-center gap-2">
                          <img src={newScreenshot.url} className="w-12 h-12 md:w-20 md:h-20 object-cover rounded-lg border border-gold-500/50" />
                          <p className="text-green-500 text-[10px] md:text-sm">Ready!</p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="text-gray-600 mb-2" size={24} md:size={32} />
                          <p className="text-gray-400 text-[10px] md:text-sm italic text-center">Select Winning Proof Image</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <input 
                  type="text" 
                  placeholder="Title" 
                  className="bg-black/50 border border-white/10 rounded-xl p-2.5 md:p-3 focus:border-gold-500/50 outline-none transition-all text-white text-sm"
                  value={activeCategory === 'screenshot' ? newScreenshot.title : ''}
                  onChange={(e) => setNewScreenshot({...newScreenshot, title: e.target.value, category: 'screenshot'})}
                />
                <input 
                  type="text" 
                  placeholder="Image URL" 
                  className="bg-black/50 border border-white/10 rounded-xl p-2.5 md:p-3 focus:border-gold-500/50 outline-none transition-all text-white opacity-50 text-sm"
                  value={newScreenshot.category === 'screenshot' ? newScreenshot.url : ''}
                  readOnly
                />
                <textarea 
                  placeholder="Description" 
                  className="bg-black/50 border border-white/10 rounded-xl p-2.5 md:p-3 focus:border-gold-500/50 outline-none transition-all text-white md:col-span-2 min-h-[80px] md:min-h-[100px] text-sm"
                  value={activeCategory === 'screenshot' ? newScreenshot.description : ''}
                  onChange={(e) => setNewScreenshot({...newScreenshot, description: e.target.value, category: 'screenshot'})}
                />
                <button 
                  onClick={addScreenshot}
                  disabled={isUploading || !newScreenshot.url || newScreenshot.category !== 'screenshot'}
                  className="md:col-span-2 py-3 md:py-4 bg-gold-500 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold rounded-xl hover:bg-gold-400 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {isUploading ? 'PLEASE WAIT...' : 'PUBLISH TO HOME'} <Send size={16} md:size={18} />
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
