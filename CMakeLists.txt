cmake_minimum_required(VERSION 3.4)

set(CMAKE_C_FLAGS "-O3 -Wall")

add_subdirectory(modules/libkss)

include_directories(modules/libkss)

file(GLOB SOURCES src/*.c)

add_executable(libkss src/main.c)
target_link_libraries(libkss kss)

if(EMSCRIPTEN)
  set(KSSPLAY_EXPORTS "'_KSSPLAY_new','_KSSPLAY_reset','_KSSPLAY_set_data','_KSSPLAY_delete','_KSSPLAY_calc','_KSSPLAY_get_loop_count','_KSSPLAY_get_fade_flag','_KSSPLAY_fade_start','_KSSPLAY_get_stop_flag','_KSSPLAY_set_device_quality','_KSSPLAY_set_silent_limit'")
  set(KSS_EXPORTS "'_KSS_new','_KSS_get_title','_KSS_delete','_KSS_bin2kss'")
  set(CMAKE_EXE_LINKER_FLAGS "--memory-init-file 0 -O3 -s EXPORTED_FUNCTIONS=\"[${KSSPLAY_EXPORTS},${KSS_EXPORTS}]\"")
endif()

# -s MODULARIZE=1 -s EXPORT_NAME=\"'LIBKSS_Module'\"