describe('Dataset Validation NodeJS API Tests', () => {
  const apiUrlNgrok = `${Cypress.env('nodeJsBaseUrl')}/api/v2/datasets/validate`;
  console.log(apiUrlNgrok)
  const apiUrlLocal = `http://localhost:8080/api/v2/datasets/validate`;
  const headersNgrok = {'ngrok-skip-browser-warning': '1', 'Origin': 'https://shalinir8.github.io'};
  const headersLocal = {'ngrok-skip-browser-warning': '1'};

  it('[NGROK] should pass validation with a valid dataset (dataset_pass.zip)', () => {
      cy.prepareFile('dataset_pass.zip', 'dataset_pass.zip', 'application/zip').then((file) => {
        const formData = new FormData();
        formData.append('zipFile', file);
        cy.request({
            method: 'POST',
            url: apiUrlNgrok,
            headersNgrok,
            body: formData,
        }).then((response) => {
            expect(response.status).to.eq(200);
        });
    });
  });

  // it('[NGROK] should fail validation with a zip containing only metadata (dataset_metadata_only.zip)', () => {
  //     cy.fixture('dataset_metadata_only.zip', 'binary')
  //         .then(Cypress.Blob.binaryStringToBlob)
  //         .then((blob) => {
  //             const formData = new FormData();
  //             formData.append('zipFile', blob, 'dataset_metadata_only.zip');

  //             cy.request({
  //                 method: 'POST',
  //                 url: apiUrlNgrok,
  //                 headersLocal,
  //                 failOnStatusCode: false, // Don't fail Cypress on expected non-2xx responses
  //                 body: formData,
  //             }).then((response) => {
  //                 expect(response.status).to.eq(400);
  //                 expect(response.body).to.have.property('status', 'error');
  //                 expect(response.body.message).to.include('must contain a "wavs" folder');
  //             });
  //         });
  // });

  // it('[NGROK] should fail validation with a zip containing only wav files (dataset_wavs_only.zip)', () => {
  //     cy.fixture('dataset_wavs_only.zip', 'binary')
  //         .then(Cypress.Blob.binaryStringToBlob)
  //         .then((blob) => {
  //             const formData = new FormData();
  //             formData.append('zipFile', blob, 'dataset_wavs_only.zip');

  //             cy.request({
  //                 method: 'POST',
  //                 url: apiUrlNgrok,
  //                 headersLocal,
  //                 failOnStatusCode: false,
  //                 body: formData,
  //             }).then((response) => {
  //                 expect(response.status).to.eq(400);
  //                 expect(response.body).to.have.property('status', 'error');
  //                 expect(response.body.message).to.include('must contain a "metadata.csv" file');
  //             });
  //         });
  // });

  // it('[NGROK] should fail validation with an invalid file type (dataset_not_zip.csv)', () => {
  //     cy.fixture('dataset_not_zip.csv', 'binary')
  //         .then(Cypress.Blob.binaryStringToBlob)
  //         .then((blob) => {
  //             const formData = new FormData();
  //             formData.append('zipFile', blob, 'dataset_not_zip.csv');

  //             cy.request({
  //                 method: 'POST',
  //                 url: apiUrlNgrok,
  //                 headersLocal,
  //                 failOnStatusCode: false,
  //                 body: formData,
  //             }).then((response) => {
  //                 expect(response.status).to.eq(400);
  //                 expect(response.body).to.have.property('status', 'error');
  //                 expect(response.body.message).to.eq('Invalid file type. Please upload a zip file.');
  //             });
  //         });
  // });
  
  // it('[LOCAL] should pass validation with a valid dataset (dataset_pass.zip)', () => {
  //   cy.prepareFile('dataset_pass.zip', 'dataset_pass.zip', 'application/zip').then((file) => {
  //     const formData = new FormData();
  //     formData.append('zipFile', file);
  //     cy.request({
  //         method: 'POST',
  //         url: apiUrlLocal,
  //         headersLocal,
  //         body: formData,
  //         failOnStatusCode: false, // Prevent Cypress from failing immediately on errors
  //     }).then((response) => {
  //         cy.log(JSON.stringify(response.body)); // Log the response for debugging
  //         expect(response.status).to.eq(200); // Adjust expected status
  //     });
  // });
  // });

  // it('[LOCAL] should fail validation with a zip containing only metadata (dataset_metadata_only.zip)', () => {
  //     cy.prepareFile('dataset_metadata_only.zip', 'dataset_metadata_only.zip', 'application/zip').then((file) => {
  //       const formData = new FormData();
  //       formData.append('zipFile', file);

  //       cy.request({
  //           method: 'POST',
  //           url: apiUrlLocal,
  //           headersLocal,
  //           failOnStatusCode: false,
  //           body: formData,
  //       }).then((response) => {
  //         let parsedBody;
  //         const textDecoder = new TextDecoder();
  //         const jsonString = textDecoder.decode(response.body);
  //         parsedBody = JSON.parse(jsonString);

  //         expect(response.status).to.eq(400);
  //         expect(parsedBody).to.have.property('status', 'error');
  //         expect(parsedBody.message).to.include('must contain a "wavs" folder');
  //       });
  //   });
  // });

  // it('[LOCAL] should fail validation with a zip containing only wav files (dataset_wavs_only.zip)', () => {
  //   cy.prepareFile('dataset_wavs_only.zip', 'dataset_wavs_only.zip', 'application/zip').then((file) => {
  //     const formData = new FormData();
  //     formData.append('zipFile', file);
  //           cy.request({
  //               method: 'POST',
  //               url: apiUrlLocal,
  //               headersLocal,
  //               failOnStatusCode: false,
  //               body: formData,
  //           }).then((response) => {
  //             let parsedBody;
  //             const textDecoder = new TextDecoder();
  //             const jsonString = textDecoder.decode(response.body);
  //             parsedBody = JSON.parse(jsonString);
  //             expect(response.status).to.eq(400);
  //             expect(parsedBody).to.have.property('status', 'error');
  //             expect(parsedBody.message).to.include('must contain a "metadata.csv" file');
  //           });
  //       });
  // });
});
