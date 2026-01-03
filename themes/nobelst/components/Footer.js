import DarkModeButton from '@/components/DarkModeButton'
import Vercel from '@/components/Vercel'
import { siteConfig } from '@/lib/config'
import dynamic from 'next/dynamic'

const NotionPage = dynamic(() => import('@/components/NotionPage'))

export const Footer = (props) => {
  const d = new Date()
  const currentYear = d.getFullYear()
  const { post, notice } = props
  const fullWidth = post?.fullWidth ?? false
  const since = siteConfig('SINCE')
  const copyrightDate = parseInt(since) < currentYear ? since + '-' + currentYear : currentYear

  return <footer
     className={`z-10 relative mt-6 flex-shrink-0 m-auto w-full text-gray-500 dark:text-gray-400 transition-all ${
       !fullWidth ? 'max-w-2xl px-4' : 'px-4 md:px-24'
     }`}
   >
     <DarkModeButton className='text-center py-4'/>
     
     {/* Notice aus Notion */}
     {notice?.blockMap && (
       <div className="my-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
         <NotionPage post={notice} className='text-sm' />
       </div>
     )}
     
     <hr className="border-gray-200 dark:border-gray-600" />
     <div className="my-4 text-sm leading-6">
       <div className="flex align-baseline justify-between flex-wrap">
         <p>
           © {siteConfig('AUTHOR')} {copyrightDate}
         </p>
         
       </div>
     </div>
   </footer>
}
