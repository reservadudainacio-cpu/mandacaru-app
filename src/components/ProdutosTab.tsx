import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, Search, X, Upload, Link } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Produto, Categoria } from '../types';

const STORAGE_BUCKET = 'product-images';

export function ProdutosTab() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    custo: '',
    estoque_atual: '',
    categoria_id: '',
    unidade: 'un',
    ativo: true,
    imagem: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [produtosRes, categoriasRes] = await Promise.all([
        supabase.from('produtos').select('*, categorias(*)').order('nome'),
        supabase.from('categorias').select('*').order('ordem'),
      ]);

      if (produtosRes.error) {
        if (import.meta.env.DEV) console.error('Erro ao carregar produtos:', produtosRes.error);
        alert('Erro ao carregar produtos. Tente novamente.');
        return;
      }
      if (categoriasRes.error) {
        if (import.meta.env.DEV) console.error('Erro ao carregar categorias:', categoriasRes.error);
        alert('Erro ao carregar categorias. Tente novamente.');
        return;
      }

      if (produtosRes.data) setProdutos(produtosRes.data);
      if (categoriasRes.data) setCategorias(categoriasRes.data);
    } catch (e) {
      if (import.meta.env.DEV) console.error('Erro ao carregar dados:', e);
      alert('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  async function deleteOldImage(url: string | null) {
    if (!url) return;
    const pathMatch = url.match(/\/product-images\/(.+)$/);
    if (!pathMatch) return;
    await supabase.storage.from(STORAGE_BUCKET).remove([pathMatch[1]]);
  }

  async function handleImageUpload(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Formato não permitido. Use apenas JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      alert('Imagem muito grande. Máximo de 5MB.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      if (editingProduto) {
        await deleteOldImage(editingProduto.imagem);
      }

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      if (urlData) {
        setFormData({ ...formData, imagem: urlData.publicUrl });
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Upload error:', e);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
    }
    setUploading(false);
  }

  function openModal(produto?: Produto) {
    if (produto) {
      setEditingProduto(produto);
      setFormData({
        nome: produto.nome,
        descricao: produto.descricao || '',
        preco: produto.preco.toString(),
        custo: produto.custo.toString(),
        estoque_atual: produto.estoque_atual.toString(),
        categoria_id: produto.categoria_id || '',
        unidade: produto.unidade,
        ativo: produto.ativo,
        imagem: produto.imagem || '',
      });
    } else {
      setEditingProduto(null);
      setFormData({
        nome: '',
        descricao: '',
        preco: '',
        custo: '',
        estoque_atual: '',
        categoria_id: categorias[0]?.id || '',
        unidade: 'un',
        ativo: true,
        imagem: '',
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      preco: parseFloat(formData.preco) || 0,
      custo: parseFloat(formData.custo) || 0,
      estoque_atual: parseFloat(formData.estoque_atual) || 0,
      categoria_id: formData.categoria_id || null,
      unidade: formData.unidade,
      ativo: formData.ativo,
      imagem: formData.imagem || null,
    };

    try {
      let error;
      if (editingProduto) {
        const { error: updateError } = await supabase.from('produtos').update(data).eq('id', editingProduto.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('produtos').insert(data);
        error = insertError;
      }

      if (error) {
        if (import.meta.env.DEV) console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto. Tente novamente.');
        return;
      }

      setShowModal(false);
      loadData();
    } catch (e) {
      if (import.meta.env.DEV) console.error('Erro ao salvar produto:', e);
      alert('Erro ao salvar produto. Tente novamente.');
    }
  }

  async function deleteProduto(id: string) {
    if (confirm('Deseja realmente excluir este produto?')) {
      try {
        const produto = produtos.find(p => p.id === id);
        if (produto?.imagem) {
          await deleteOldImage(produto.imagem);
        }

        const { error } = await supabase.from('produtos').delete().eq('id', id);

        if (error) {
          if (import.meta.env.DEV) console.error('Erro ao excluir produto:', error);
          alert('Erro ao excluir produto. Tente novamente.');
          return;
        }

        loadData();
      } catch (e) {
        if (import.meta.env.DEV) console.error('Erro ao excluir produto:', e);
        alert('Erro ao excluir produto. Tente novamente.');
      }
    }
  }

  const filteredProdutos = produtos
    .filter((p) => {
      const matchSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategoria = !categoriaFiltro || p.categoria_id === categoriaFiltro;
      return matchSearch && matchCategoria;
    })
    .sort((a, b) => {
      const ordemA = a.categorias?.ordem || 999;
      const ordemB = b.categorias?.ordem || 999;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return a.nome.localeCompare(b.nome);
    });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Produtos</h2>
          <p className="text-gray-500 text-sm">Gerencie o cardápio e preços</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Todas categorias</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {categoriaFiltro === '' ? (
        categorias.map((categoria) => {
          const produtosDaCategoria = filteredProdutos.filter(p => p.categoria_id === categoria.id);
          if (produtosDaCategoria.length === 0) return null;
          return (
            <div key={categoria.id} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                {categoria.nome}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {produtosDaCategoria.map((produto) => (
                  <div
                    key={produto.id}
                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {produto.imagem ? (
                      <div className="h-32 bg-gray-100 overflow-hidden rounded-t-xl">
                        <img
                          src={produto.imagem}
                          alt={produto.nome}
                          className="w-full h-full object-cover object-center"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <div className="h-32 bg-gradient-to-r from-amber-100 to-orange-100 flex items-center justify-center rounded-t-xl">
                        <Package className="w-10 h-10 text-orange-300" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">{produto.nome}</h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            produto.ativo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {produto.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      {produto.descricao && (
                        <p className="text-sm text-gray-500 mb-3">{produto.descricao}</p>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-amber-50 rounded-lg p-2">
                          <p className="text-gray-500 text-xs">Preço</p>
                          <p className="font-bold text-orange-600">{formatCurrency(produto.preco)}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <p className="text-gray-500 text-xs">Custo</p>
                          <p className="font-bold text-green-600">{formatCurrency(produto.custo)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-gray-500 text-xs">Lucro</p>
                          <p className="font-bold text-blue-600">
                            {formatCurrency(produto.preco - produto.custo)}
                          </p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2">
                          <p className="text-gray-500 text-xs">Estoque</p>
                          <p className="font-bold text-purple-600">
                            {produto.estoque_atual} {produto.unidade}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <button
                          onClick={() => openModal(produto)}
                          className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduto(produto.id)}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProdutos.map((produto) => (
          <div
            key={produto.id}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            {produto.imagem ? (
              <div className="h-32 bg-gray-100 overflow-hidden rounded-t-xl">
                <img
                  src={produto.imagem}
                  alt={produto.nome}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="h-32 bg-gradient-to-r from-amber-100 to-orange-100 flex items-center justify-center rounded-t-xl">
                <Package className="w-10 h-10 text-orange-300" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{produto.nome}</h3>
                  <p className="text-xs text-gray-500">
                    {produto.categorias?.nome || 'Sem categoria'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    produto.ativo
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {produto.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {produto.descricao && (
                <p className="text-sm text-gray-500 mb-3">{produto.descricao}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-amber-50 rounded-lg p-2">
                  <p className="text-gray-500 text-xs">Preço</p>
                  <p className="font-bold text-orange-600">{formatCurrency(produto.preco)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-gray-500 text-xs">Custo</p>
                  <p className="font-bold text-green-600">{formatCurrency(produto.custo)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-gray-500 text-xs">Lucro</p>
                  <p className="font-bold text-blue-600">
                    {formatCurrency(produto.preco - produto.custo)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2">
                  <p className="text-gray-500 text-xs">Estoque</p>
                  <p className="font-bold text-purple-600">
                    {produto.estoque_atual} {produto.unidade}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={() => openModal(produto)}
                  className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteProduto(produto.id)}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}

      {filteredProdutos.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum produto encontrado</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto do Produto
                </label>
                <div className="flex flex-col gap-3">
                  {formData.imagem && (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                      <img
                        src={formData.imagem}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imagem: '' })}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                      <Upload className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {uploading ? 'Enviando...' : 'Upload'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                      />
                    </label>
                    <div className="flex-1 flex items-center gap-2">
                      <Link className="w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        placeholder="Ou cole URL da imagem..."
                        value={formData.imagem}
                        onChange={(e) => setFormData({ ...formData, imagem: e.target.value })}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço Venda *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.custo}
                    onChange={(e) => setFormData({ ...formData, custo: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.estoque_atual}
                    onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="un">Unidade</option>
                    <option value="kg">Quilograma</option>
                    <option value="lt">Litro</option>
                    <option value="pc">Porção</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selecione...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-orange-500 rounded"
                />
                <label htmlFor="ativo" className="text-sm text-gray-700">
                  Produto ativo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-md"
                >
                  {editingProduto ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
