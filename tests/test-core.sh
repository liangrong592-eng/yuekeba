#!/bin/bash
BASE="http://127.0.0.1:3000"
PASS=0; FAIL=0; TOTAL=10

green() { echo -e "\033[32m✅ $1\033[0m"; }
red() { echo -e "\033[31m❌ $1\033[0m"; }

echo "=============================="
echo "  约课吧 核心功能测试"
echo "=============================="
echo ""

# 1. 首页
R=$(curl -s --max-time 30 -o /dev/null -w "%{http_code}" "$BASE/" 2>&1)
[ "$R" = "200" ] && { green "首页 HTTP 200"; ((PASS++)); } || { red "首页 $R"; ((FAIL++)); }

# 2. 可约时段
R=$(curl -s --max-time 15 "$BASE/api/available-slots?date=2026-06-30" 2>&1)
echo "$R" | grep -q '"slots"' && { green "可约时段 API"; ((PASS++)); } || { red "可约时段 API"; ((FAIL++)); }

# 3. 排行榜
R=$(curl -s --max-time 15 "$BASE/api/ranking" 2>&1)
echo "$R" | grep -q '"rankings"' && { green "排行榜 API"; ((PASS++)); } || { red "排行榜 API"; ((FAIL++)); }

# 4. 创建预约（使用固定名字+确认码验证）
NAME="test_$(date +%s)"
R=$(curl -s --max-time 15 -X POST "$BASE/api/bookings" -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"date\":\"2026-06-30\",\"slot\":\"12:30-13:30\"}" 2>&1)
if echo "$R" | grep -q '"success":true'; then
  green "创建预约成功 ($NAME)"
  CODE=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['booking']['confirmCode'])" 2>/dev/null)
  echo "   确认码: $CODE"
  ((PASS++))
else
  red "创建预约失败: $R"
  ((FAIL++))
fi

# 5. 重复预约拦截
R=$(curl -s --max-time 15 -X POST "$BASE/api/bookings" -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"date\":\"2026-06-30\",\"slot\":\"6:30-7:00\"}" 2>&1)
echo "$R" | grep -q '"error"' && { green "重复预约拦截"; ((PASS++)); } || { red "重复预约未拦截"; ((FAIL++)); }

# 6. 正确取消 (0000)
R=$(curl -s --max-time 15 -X POST "$BASE/api/bookings/cancel" -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"confirmCode\":\"0000\"}" 2>&1)
echo "$R" | grep -q '"success":true' && { green "取消成功"; ((PASS++)); } || { red "取消失败: $R"; ((FAIL++)); }

# 7. 周日不可约
R=$(curl -s --max-time 15 -X POST "$BASE/api/bookings" -H "Content-Type: application/json" \
  -d "{\"name\":\"sunday_test\",\"date\":\"2026-06-28\",\"slot\":\"12:30-13:30\"}" 2>&1)
echo "$R" | grep -q "周日" && { green "周日拦截"; ((PASS++)); } || { red "周日未拦截"; ((FAIL++)); }

# 8. 管理后台验证
R=$(curl -s --max-time 15 -X POST "$BASE/api/admin/verify" -H "Content-Type: application/json" \
  -d '{"password":"admin123"}' 2>&1)
echo "$R" | grep -q '"success"' && { green "管理后台验证"; ((PASS++)); } || { red "管理后台异常"; ((FAIL++)); }

# 9. 可用时段列表包含李五
R=$(curl -s --max-time 15 "$BASE/api/available-slots?date=2026-06-30" 2>&1)
echo "$R" | grep -q "李五" && { green "时段列表显示预约人"; ((PASS++)); } || { red "时段列表缺失预约人"; ((FAIL++)); }

echo ""
echo "=============================="
echo "  $PASS/$TOTAL 通过"
echo "=============================="
