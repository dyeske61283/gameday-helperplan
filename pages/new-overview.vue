<template>
  <div class="grid auto-rows-max grid-cols-1 p-2 gap-2">
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="card-title">
          <span>
            Termine
          </span> 
          <button class="btn btn-square btn-sm ml-auto">
            <div class="badge badge-warning">Offen</div>
          </button>
        </div>
        <div class="divider mt-0.5"></div>
        <ul class="card-actions items-center bg-base-100">
          <button class="btn">Terminplan anpassen</button>
          <button class="btn">Termine importieren</button>
          <button class="btn">Dienstarten anpassen</button>
        </ul>
      </div>
    </div>

    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="card-title">
          <span>
            Helferlisten
          </span> 
          <button class="btn btn-square btn-sm ml-auto">
            <div class="badge badge-warning">Offen</div>
          </button>
        </div>        
        <div class="divider mt-0.5"></div>
        <ul class="card-actions items-center bg-base-100">
          <button class="btn">Helfer-Listen erstellen</button>
          <button class="btn">Helfer-Listen bearbeiten</button>
          <button class="btn">Helfer-Lehrgänge bearbeiten</button>
        </ul>
      </div>
    </div>
  </div>

</template>
<script lang="ts" setup>

</script>