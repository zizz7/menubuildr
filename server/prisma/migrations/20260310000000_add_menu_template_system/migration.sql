-- CreateTable
CREATE TABLE "menu_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "preview_image_url" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_templates_slug_key" ON "menu_templates"("slug");

-- AlterTable
ALTER TABLE "menus" ADD COLUMN "template_id" TEXT;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "menu_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default templates
INSERT INTO "menu_templates" ("id", "slug", "name", "description", "preview_image_url", "version", "is_active", "created_at", "updated_at") VALUES
(
    gen_random_uuid(),
    'classic',
    '{"ENG": "Classic", "CHN": "经典", "GER": "Klassisch", "JAP": "クラシック", "RUS": "Классический"}',
    '{"ENG": "Traditional menu layout with section navigation and detailed item cards", "CHN": "传统菜单布局，带有分区导航和详细项目卡", "GER": "Traditionelles Menülayout mit Abschnittsnavigation und detaillierten Artikelkarten", "JAP": "セクションナビゲーションと詳細なアイテムカードを備えた伝統的なメニューレイアウト", "RUS": "Традиционный макет меню с навигацией по разделам и подробными карточками товаров"}',
    '/template-previews/classic-preview.png',
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
    '/template-previews/card-based-preview.png',
    '1.0.0',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Associate existing published menus with Classic template
UPDATE "menus"
SET "template_id" = (SELECT "id" FROM "menu_templates" WHERE "slug" = 'classic')
WHERE "status" = 'published';
