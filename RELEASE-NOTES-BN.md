# My Overtime BD — Release Package Notes

## কী আছে
- মূল Next.js My Overtime BD অ্যাপ; মূল UI, navigation, API routes ও Supabase integration অক্ষত রাখা হয়েছে।
- মূল অ্যাপের ৭টি সংশোধিত ফাইল: PWA install fallback, notice/countdown rendering, local calendar date handling, backup filename date, service-worker version bump।
- Next.js এবং eslint-config-next উভয়ই 16.4.6 নির্ধারিত।
- `pwa/` ফোল্ডারটি আগের GitHub push করা standalone PWA prototype; এটি মূল Next.js app-এর production entrypoint নয় এবং মূল Dashboard-এ embed করা হয়নি।

## Termux-এ যাচাইকৃত ফলাফল (ব্যবহারকারীর ডিভাইস থেকে)
- `npm run lint`: সফল
- `npx next build --webpack`: সফল, Next.js 16.4.6 (এই প্যাকেজে পরবর্তী নিরাপত্তা সংশোধনগুলোর পরে পুনরায় Build চালানো যায়নি)
- JavaScript syntax checks: সফল
- Standalone PWA unit tests: ১০/১০ সফল
- Admin notice-এ raw HTML sink scan: কোনো `dangerouslySetInnerHTML` অবশিষ্ট নেই
- `git diff --check`: সফল

## গুরুত্বপূর্ণ বাকি যাচাই
- সর্বশেষ `npm audit`-এর পূর্ণ ফলাফল এই release artifact তৈরির সময় পাওয়া যায়নি। Next.js 16.4.6 আপডেটের পর পাওয়া রিপোর্টে ৭টি Moderate ছিল; পরে `npm audit fix` আবার চালানো হয়েছে, তাই release করার আগে `npm audit` পুনরায় চালাতে হবে।
- পুরোনো ব্যক্তিগত Backup JSON এই প্যাকেজ তৈরির সময় উপলব্ধ ছিল না; বাস্তব Backup Restore/Migration পরীক্ষা করা হয়নি।
- Friday/Holiday payroll policy ব্যবহারকারীর কাছ থেকে নিশ্চিত না হওয়ায় সেই হিসাবের নিয়ম পরিবর্তন করা হয়নি।
- Local month initialization-এ UTC boundary dependency সরানো হয়েছে।
- UID/Cloud/Supabase schema বা production secrets পরিবর্তন করা হয়নি। Cloud backup/auth security end-to-end পরীক্ষা করা হয়নি।
- Live Render deployment করা হয়নি।

## Install / lockfile
এই প্যাকেজে `package-lock.json` রাখা হয়নি, কারণ এটি Next.js 16.2.1-এর lockfile ছিল এবং Termux-এ Next.js 16.4.6-এ আপডেটের পর ব্যবহারকারীর ডিভাইসে নতুন lockfile তৈরি হয়েছে, যা এখানে পাওয়া যায়নি।

প্রজেক্ট root-এ চালান (Termux ও Linux উভয়ের জন্য build script Webpack ব্যবহার করে):

```bash
npm install
npm run lint
npm run build
npm audit
```

`npm install` নতুন version-aligned `package-lock.json` তৈরি করবে। সেটি commit/push করার আগে audit result পরীক্ষা করুন। Render/Linux build-এর জন্য `npm run build` ব্যবহার করা যাবে; Android Termux-এ Turbopack unsupported হলে `npx next build --webpack` ব্যবহার করুন।

## নিরাপত্তা
- `.env*`, service-role keys, admin passwords বা production secrets ZIP/GitHub-এ যোগ করবেন না।
- পুরোনো production branch-এ push করার আগে backup রাখুন এবং deployment logs পরীক্ষা করুন।

## Final handoff status
এই ZIP হলো নিরাপত্তা-সীমিত local-first release candidate; সম্পূর্ণ cloud-enabled production release নয়। ZIP তৈরির পর Next.js production build পুনরায় চালানো হয়নি, কারণ এই পরিবেশে dependency installation/lockfile generation সময়সীমায় শেষ হয়নি। Final push/deploy-এর আগে ব্যবহারকারীর Termux-এ `npm install`, `npm run lint`, `npm run build`, `npm audit` চালাতে হবে।

## Email OTP ও Cloud Backup প্রস্তুতি
- Supabase browser client যুক্ত হয়েছে; OTP sign-in ও ৬ সংখ্যার email code verification Settings-এর Cloud Backup অংশে পাওয়া যাবে।
- Authenticated user-এর `user_settings` এবং `overtime_entries` টেবিল ব্যবহার করা হয়েছে; বিদ্যমান RLS নীতিমালা `auth.uid()` অনুযায়ী ডেটা আলাদা রাখে।
- Cloud Upload কেবল upsert করে; Cloud-only entry মুছে দেয় না। Restore বর্তমান ডিভাইসের Local data প্রতিস্থাপন করে—আগে JSON backup নেওয়া উচিত।
- Hosting-এ `NEXT_PUBLIC_SUPABASE_URL` এবং `NEXT_PUBLIC_SUPABASE_ANON_KEY` সেট করতে হবে। এখানে service-role key ব্যবহার করা হয়নি।
- Production deploy করার আগে install/build, test account OTP delivery, upload/restore এবং RLS আচরণ যাচাই আবশ্যক।
