-- Seed default templates
INSERT INTO "menu_templates" ("id", "slug", "name", "description", "preview_image_url", "version", "is_active", "created_at", "updated_at") VALUES
(
    gen_random_uuid(),
    'classic',
    '{"ENG": "Classic", "CHN": "经典", "GER": "Klassisch", "JAP": "クラシック", "RUS": "Классический"}',
    '{"ENG": "Traditional menu layout with section navigation and detailed item cards", "CHN": "传统菜单布局，带有分区导航和详细项目卡", "GER": "Traditionelles Menülayout mit Abschnittsnavigation und detaillierten Artikelkarten", "JAP": "セクションナビゲーションと詳細なアイテムカードを備えた伝統的なメニューレイアウト", "RUS": "Традиционный макет меню с навигацией по разделам и подробными карточками товаров"}',
    '/template-previews/classic-preview.svg',
    '1.0.0',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    gen_random_uuid(),
    'card-based',
    '{"ENG": "Card-Based", "CHN": "卡片式", "GER": "Kartenbasiert", "JAP": "カードベース", "RUS": "На основе карт"}',
    '{"ENG": "Modern grid layout with image-focused cards and responsive design", "CHN": "现代网格布局，以图像为中心的卡片和响应式设计", "GER": "Modernes Rasterlayout mit bildorientierten Karten und responsivem Design", "JAP": "画像重視のカードとレスポンシブデザインを備えたモダンなグリッドレイアウト", "RUS": "Современный макет сетки с карточками, ориентированными на изображения, и адаптивным дизайном"}',
    '/template-previews/card-based-preview.svg',
    '1.0.0',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO NOTHING;

-- Insert CoraFlow template
INSERT INTO "menu_templates" ("id", "slug", "name", "description", "preview_image_url", "version", "is_active", "created_at", "updated_at") VALUES
(
    gen_random_uuid(),
    'coraflow',
    '{"ENG": "CoraFlow", "CHN": "CoraFlow", "GER": "CoraFlow", "JAP": "CoraFlow", "RUS": "CoraFlow"}',
    '{"ENG": "Vibrant glassmorphism design with ambient gradient orbs, teal/orange/pink/blue palette, and smooth animations", "CHN": "充满活力的玻璃拟态设计，带有环境渐变球体和流畅动画", "GER": "Lebhaftes Glasmorphismus-Design mit Umgebungsverlaufskugeln und fließenden Animationen", "JAP": "アンビエントグラデーションオーブとスムーズなアニメーションを備えた鮮やかなグラスモーフィズムデザイン", "RUS": "Яркий дизайн в стиле глассморфизм с градиентными сферами и плавными анимациями"}',
    '/template-previews/coraflow-preview.svg',
    '1.0.0',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO NOTHING;

-- Associate existing published menus with Classic template
UPDATE "menus"
SET "template_id" = (SELECT "id" FROM "menu_templates" WHERE "slug" = 'classic')
WHERE "status" = 'published' AND "template_id" IS NULL;
