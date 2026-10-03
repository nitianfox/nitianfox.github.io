import type {
    SiteConfig,
    ProfileConfig,
    LicenseConfig,
} from "./types/config"
import type { FriendLink } from "./types/friend"
import type { I18nConfig } from "./types/i18n"

export const siteConfig: SiteConfig = {
    title: "NTFOX", // Title of the site, used in the tab in the browser and in SEO
    subTitle: "Blog", // Subtitle of the site
    // ⚠️ 上线前把这里改成你的真实域名：SEO/OG 绝对地址、sitemap.xml、rss.xml 都用它
    rootSiteUrl: "http://localhost:4321", // Root URL of the site, used for generating absolute URLs for SEO and social sharing

    favicon: "/favicon/favicon.ico", // Path of the favicon, relative to the /public directory

    pageSize: 6, // Number of posts per page
    toc: {
        enable: true,
        depth: 3 // Max depth of the table of contents, between 1 and 4
    },
    blogNavi: {
        enable: true // Whether to enable blog navigation in the blog footer
    },
    comments: {
        enable: false, // 还没部署评论后端，先关掉；打开前先把下面的 backendUrl 填成自己的
        platform: "default", // Comment platform, set "default" to use Momo-backend, also supports "twikoo"
        backendUrl: "" // 例如 "https://your-comment-backend.example.com"
    },
    // 站点统计（umami）。默认关闭 = 全站不向任何第三方域名发请求。
    // 想统计自己的流量时，填自己的实例地址，例如：
    // { enable: true, script: "https://umami.example.com/script.js" }
    analytics: {
        enable: false,
        script: ""
    },
    theme: {
        AOS: true, // Whether to enable AOS (Animate On Scroll) for animations
        LQIP: true, // Whether to enable LQIP (Low-Quality Image Placeholder) for image placeholders
        PhotoSwipe: true, // Whether to enable PhotoSwipe for image viewer
        imageCollage: {
            enable: true, // Whether to automatically arrange consecutive images into a grid (collage)
            maxColumns: 4 // Max images per row in a collage (2 - 6); the actual number is chosen automatically
        },
        postCard: {
            imageMode: "top" // Cover image mode for article cards: "top" shows the image above the content; "background" uses the image as the card background, fading to transparent from right to left
        },
        photoCover: {
            // 想开首页整屏照片封面时：把 enable 改成 true，并把 /public/cover.jpg 换成你自己的照片
            enable: false, // Whether to use a full-screen photo as the background of the home page; the title and subtitle are centered, and everything smoothly returns to the normal style as you scroll down
            image: "/cover.jpg", // Photo path: relative to the /public directory if it starts with '/', otherwise relative to the /src directory (e.g. assets/cover.jpg). The blurred placeholder is generated at build time, so there is no small image to prepare by hand
            mask: 0.5 // Opacity (0 - 1) of the black mask over the photo, fading away as you scroll down
        },
        overlayScrollbars: {
            enable: true, // Whether to replace the browser's default scrollbar with OverlayScrollbars (overlay style, can auto-hide)
            autoHide: "leave", // When to hide the scrollbar: "never" always visible; "scroll" hidden unless scrolling; "move" hidden unless the pointer moves over the page or the user scrolls; "leave" hidden when the pointer leaves the page or the user isn't scrolling
            size: 8 // Scrollbar thickness in pixels
        }
    },
    expressiveCode: {
        enable: true, // Whether to enable Expressive Code for code blocks; when false, code blocks fall back to plain text without highlighting (same in the CMS preview)
        theme: "one-dark-pro" // Shiki theme of code blocks, e.g. "one-dark-pro", "github-dark", "vitesse-dark"; one theme is used for both light and dark mode
    }
}

export const profileConfig: ProfileConfig = {
    avatar: "assets/avatar.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
    name: "NTFOX", // Used in the footer of the blog
    description: "NTFOX 的博客：记录技术、折腾与生活。", // Used in SEO
    indexPage: "", // 留空则页脚名字链回站点首页；也可以填成你的主站地址
    startYear: 2026, // The year the site was created, used in the footer
}

export const licenseConfig: LicenseConfig = {
	enable: true, // Whether to enable license information
	name: "CC BY-NC-SA 4.0", // License name
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/", // License URL
};

export const i18nConfig: I18nConfig = {
    defaultLanguage: "zh-cn", // Default language of the site
    supportedLanguages: ["zh-cn", "en"], // List of supported languages
    translations: { // Translation content for each supported language
        "zh-cn": {
            Cover: {
                title: {
                    home: "欢迎来到 NTFOX",
                    archive: "文章归档",
                    about: "关于",
                    friends: "友链",
                },
                subTitle: {
                    home: "记录技术、折腾与生活",
                    archive: "共 {count} 篇文章", // {count} will be replaced with the total number of articles
                    about: "关于这个站点",
                    friends: "有趣的灵魂",
                }
            }
        },
        "en": {
            Cover: {
                title: {
                    home: "Welcome to NTFOX",
                    archive: "Archive",
                    about: "About",
                    friends: "Friends",
                },
                subTitle: {
                    home: "Notes on code, tinkering and life",
                    archive: "Total of {count} articles",
                    about: "About this site",
                    friends: "Interesting Souls",
                }
            }
        }
    }
};

export const friendLinkConfig: FriendLink[] = [
    // 友链：按下面格式继续往里加即可
    {
        name: 'Astro',
        avatar: 'https://avatars.githubusercontent.com/u/44914786',
        url: 'https://astro.build',
        description: 'Build fast websites, faster.'
    }
]
