"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Camera, Loader2, Save, Image as ImageIcon } from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Form State
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  
  // URL States (To show preview and save to DB)
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // Uploading States
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth");
        return;
      }
      setUser(session.user);

      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data && !error) {
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
        setCoverUrl(data.cover_url || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  // Image Upload Logic (Gallery se Supabase storage tak)
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>, isAvatar: boolean) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      
      if (isAvatar) setUploadingAvatar(true);
      else setUploadingCover(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `profiles/${fileName}`; // Folders inside 'uploads' bucket

      // Upload to Supabase 'uploads' bucket
      const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);

      if (isAvatar) setAvatarUrl(publicUrl);
      else setCoverUrl(publicUrl);

    } catch (error: any) {
      alert("Image upload fail ho gayi: " + error.message);
    } finally {
      if (isAvatar) setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);

    const updates = {
      id: user.id,
      username,
      full_name: fullName,
      bio,
      avatar_url: avatarUrl,
      cover_url: coverUrl,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile update ho gayi!' });
      setTimeout(() => router.push('/profile'), 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error updating profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={32} /></div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition text-gray-700"><ArrowLeft size={20} /></button>
            <h1 className="text-lg font-bold text-gray-900">Edit Profile</h1>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 text-sm font-bold text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-50 transition active:scale-95 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <form onSubmit={handleSave} className="px-4 pt-6 space-y-8 max-w-md mx-auto">
        {message && <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>}

        {/* Image Upload Section */}
        <div className="space-y-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Profile Images</h2>
          
          <div className="space-y-5">
            {/* Cover Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1">Cover Image</label>
              <div className="relative w-full h-32 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex flex-col items-center justify-center group">
                {coverUrl ? <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" /> : <div className="text-gray-400 flex flex-col items-center"><ImageIcon size={28} className="mb-1"/><span className="text-xs font-semibold">Tap to select cover</span></div>}
                
                <input type="file" accept="image/*" onChange={(e) => uploadImage(e, false)} disabled={uploadingCover} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                
                {uploadingCover && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center"><Loader2 size={24} className="animate-spin text-black" /></div>}
              </div>
            </div>

            {/* Avatar Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1">Profile Photo (DP)</label>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 bg-gray-100 rounded-full overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
                  {avatarUrl ? <img src={avatarUrl} alt="DP" className="w-full h-full object-cover" /> : <Camera size={20} className="text-gray-400" />}
                  {uploadingAvatar && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center"><Loader2 size={20} className="animate-spin text-black" /></div>}
                </div>
                <div className="relative flex-1">
                    <button type="button" className="bg-gray-100 text-gray-900 text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 w-full">Change Photo</button>
                    <input type="file" accept="image/*" onChange={(e) => uploadImage(e, true)} disabled={uploadingAvatar} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Text Info Section */}
        <div className="space-y-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
           <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Personal Info</h2>
           <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Username</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))} placeholder="e.g. ranveerk" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 outline-none focus:border-black transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ranveer Kushwah" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 outline-none focus:border-black transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Bio</label>
            <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Apne baare mein kuch likhein... (Max 160 words)" maxLength={160} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 outline-none focus:border-black transition resize-none" />
          </div>
        </div>
      </form>
    </div>
  );
}
