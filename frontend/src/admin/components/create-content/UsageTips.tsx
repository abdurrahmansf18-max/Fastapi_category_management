import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";

export default function UsageTips() {
  const { t } = useTranslation();
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-900/10 dark:to-green-900/10 border border-emerald-200/30 dark:border-emerald-800/30">
          <div className="text-sm text-emerald-800 dark:text-emerald-200">
            <div className="font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              {t("usage_tips")}
            </div>
            <ul className="space-y-1 text-xs text-emerald-700 dark:text-emerald-300">
              <li>• {t("tip_1")}</li>
              <li>
                • {t('tip_2_1')}{" "}
                <code className="bg-emerald-200 dark:bg-emerald-800 px-1 rounded">
                  &lt;--image--&gt;
                </code>{" "}
                {t('tip_2_2')}
              </li>
              <li>• {t("tip_3")}</li>
              <li>• {t("tip_4")}</li>
            </ul>
          </div>
        </div>
  );
}
