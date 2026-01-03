import DarkModeButton from '@/components/DarkModeButton'
import Vercel from '@/components/Vercel'
import { siteConfig } from '@/lib/config'
import SmartLink from '@/components/SmartLink'
import dynamic from 'next/dynamic'

const NotionPage = dynamic(() => import('@/components/NotionPage'))

export const Footer = (props) => {
  const d = new Date()
  const currentYear = d.getFullYear()
  const { post, notice, NOTION_CONFIG } = props
  const fullWidth = post?.fullWidth ?? false
  const since = siteConfig('SINCE')
  const copyrightDate = parseInt(since) < currentYear ? since + '-' + currentYear : currentYear

  // Footer Links aus Konfiguration
  const footerLink1Title = siteConfig('FOOTER_LINK_1_TITLE', null, NOTION_CONFIG)
  const footerLink1Url = siteConfig('FOOTER_LINK_1_URL', null, NOTION_CONFIG)
  const footerLink2Title = siteConfig('FOOTER_LINK_2_TITLE', null, NOTION_CONFIG)
  const footerLink2Url = siteConfig('FOOTER_LINK_2_URL', null, NOTION_CONFIG)

  return <footer
     className={`z-10 relative mt-6 flex-shrink-0 m-auto w-full text-gray-500 dark:text-gray-400 transition-all ${
       !fullWidth ? 'max-w-2xl px-4' : 'px-4 md:px-24'
     }`}
   >
     <DarkModeButton className='text-center py-4'/>
     
     {/* Notice aus Notion */}
     {notice?.blockMap && (
       <div className="my-6">
         <NotionPage post={notice} className='text-center' />
       </div>
     )}
     
     <hr className="border-gray-200 dark:border-gray-600" />
     <div className="my-4 text-sm leading-6">
       <div className="flex align-baseline justify-between flex-wrap gap-x-4">
         <p>
           © {siteConfig('AUTHOR')} {copyrightDate}
         </p>
         <div className="flex gap-x-4">
           {footerLink1Title && footerLink1Url && (
             <SmartLink href={footerLink1Url} className="hover:text-gray-700 dark:hover:text-gray-200">
               {footerLink1Title}
             </SmartLink>
           )}
           {footerLink2Title && footerLink2Url && (
             <SmartLink href={footerLink2Url} className="hover:text-gray-700 dark:hover:text-gray-200">
               {footerLink2Title}
             </SmartLink>
           )}
         </div>
       </div>
     </div>
   </footer>
}
