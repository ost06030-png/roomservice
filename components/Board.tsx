
import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';

interface Post {
  id: string;
  title: string;
  content: string;
  authorEmail: string;
  authorUid: string;
  createdAt: Timestamp | null;
}

export const Board: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 실시간 데이터베이스 구독
  useEffect(() => {
    setIsLoading(true);
    setPermissionError(false);
    
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const postsData: Post[] = [];
        querySnapshot.forEach((doc) => {
          postsData.push({ 
            id: doc.id, 
            ...doc.data() 
          } as Post);
        });
        setPosts(postsData);
        setIsLoading(false);
      }, (error: any) => {
        if (error.code === 'permission-denied') setPermissionError(true);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      setIsLoading(false);
    }
  }, []);

  // RTF 서식 적용 함수
  const execCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  // 이미지 업로드 및 삽입 처리
  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 용량 제한 경고 (Firestore 1MB 제한 고려)
    if (file.size > 500000) {
      alert("이미지 용량이 너무 큽니다. 500KB 이하의 이미지를 권장합니다.");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target?.result as string;
      // 현재 포커스 위치에 이미지 삽입
      const imgTag = `<img src="${base64Image}" alt="uploaded image" style="max-width: 100%; border-radius: 12px; margin: 12px 0; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />`;
      execCommand('insertHTML', imgTag);
      // 인풋 초기화
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // 2. 게시물 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = editorRef.current?.innerHTML || "";
    if (!title.trim() || !finalContent.trim() || finalContent === "<react-empty-area>") return;
    
    if (!auth.currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        title: title.trim(),
        content: finalContent,
        authorEmail: auth.currentUser.email,
        authorUid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setTitle('');
      if (editorRef.current) editorRef.current.innerHTML = '';
      setContent('');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        setPermissionError(true);
      } else {
        alert("저장에 실패했습니다. 이미지 용량이 너무 클 수 있습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm("정말 이 게시글을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error: any) {
      alert("삭제 권한이 없거나 오류가 발생했습니다.");
    }
  };

  if (permissionError) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-8 space-y-6">
        <div className="flex items-center space-x-4">
          <div className="text-4xl">🔐</div>
          <div>
            <h3 className="text-xl font-bold text-amber-900">Firestore 권한 설정이 필요합니다</h3>
            <p className="text-amber-700 text-sm">Firebase Console에서 보안 규칙을 업데이트해야 앱이 정상 작동합니다.</p>
          </div>
        </div>
        <div className="bg-slate-900 rounded-xl p-5 overflow-x-auto">
          <pre className="text-slate-300 text-xs font-mono leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{post} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null 
                    && request.auth.uid == resource.data.authorUid;
    }
  }
}`}
          </pre>
        </div>
        <button onClick={() => window.location.reload()} className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold">규칙 적용 후 새로고침</button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* RTF 에디터 섹션 */}
      <section className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden transition-all focus-within:border-indigo-400">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-8 py-6 text-2xl font-black placeholder-slate-200 outline-none border-b border-slate-50"
            required
          />
          
          {/* RTF 툴바 */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-1 items-center">
            {[
              { cmd: 'bold', icon: 'B', label: '굵게', style: 'font-bold' },
              { cmd: 'italic', icon: 'I', label: '기울임', style: 'italic' },
              { cmd: 'underline', icon: 'U', label: '밑줄', style: 'underline' },
              { cmd: 'strikeThrough', icon: 'S', label: '취소선', style: 'line-through' },
            ].map((btn) => (
              <button
                key={btn.cmd}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCommand(btn.cmd); }}
                className={`w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all ${btn.style}`}
                title={btn.label}
              >
                {btn.icon}
              </button>
            ))}
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCommand('insertUnorderedList'); }}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600"
              title="글머리 기호"
            >
              •
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCommand('insertOrderedList'); }}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600"
              title="번호 매기기"
            >
              1.
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCommand('formatBlock', 'H3'); }}
              className="px-3 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600 font-bold"
            >
              H
            </button>

            {/* 사진 추가 버튼 */}
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-indigo-600"
              title="사진 추가"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageInsert}
            />
          </div>

          {/* 편집 영역 */}
          <div
            ref={editorRef}
            contentEditable
            onInput={() => setContent(editorRef.current?.innerHTML || "")}
            className="px-8 py-6 min-h-[250px] text-slate-700 outline-none text-lg leading-relaxed prose prose-slate max-w-none"
            placeholder="당신의 이야기를 서식과 사진과 함께 들려주세요..."
          />
          
          <style>{`
            [contenteditable]:empty:before {
              content: attr(placeholder);
              color: #cbd5e1;
              cursor: text;
            }
            .prose ul { list-style-type: disc; padding-left: 1.5rem; }
            .prose ol { list-style-type: decimal; padding-left: 1.5rem; }
            .prose img { max-width: 100%; height: auto; border-radius: 1rem; display: block; margin: 1.5rem 0; }
          `}</style>

          <div className="px-8 py-4 bg-slate-50 flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center">
              <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2 animate-pulse"></span>
              Rich Text & Image Mode
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-10 py-3 rounded-2xl font-black text-sm transition-all shadow-lg ${
                isSubmitting ? 'bg-slate-300 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
              }`}
            >
              {isSubmitting ? 'SAVING...' : '게시물 올리기'}
            </button>
          </div>
        </form>
      </section>

      {/* 목록 섹션 */}
      <section className="space-y-8">
        <h3 className="text-3xl font-black text-slate-800 tracking-tight">Feed</h3>

        {isLoading ? (
          <div className="flex justify-center py-20 animate-pulse text-indigo-200">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" /></svg>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[40px] border-4 border-dashed border-white text-slate-400 font-bold">아직 소식이 없습니다.</div>
        ) : (
          <div className="grid gap-8">
            {posts.map((post) => (
              <article key={post.id} className="group bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-2xl transition-all relative overflow-hidden">
                {auth.currentUser?.uid === post.authorUid && (
                  <button onClick={() => handleDelete(post.id)} className="absolute top-8 right-8 p-3 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
                
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
                    {post.authorEmail?.[0].toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-black text-slate-800">{post.authorEmail?.split('@')[0]}</h5>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                      {post.createdAt ? post.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </p>
                  </div>
                </div>

                <h4 className="text-2xl font-black text-slate-900 mb-4">{post.title}</h4>
                
                {/* HTML 서식 및 이미지 렌더링 영역 */}
                <div 
                  className="prose prose-slate max-w-none text-slate-600 text-lg leading-relaxed mb-6"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />

                <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>#MEMO</span>
                  <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Shared Publicly</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
