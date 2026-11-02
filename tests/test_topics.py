import importlib.util
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib import error
spec=importlib.util.spec_from_file_location('collector',Path(__file__).parents[1]/'scripts/collect_topics.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class Fake:
 def __init__(self,data): self.data=data;self.calls=[]
 def json(self,*args): self.calls.append(args);return self.data
class Topics(unittest.TestCase):
 def setUp(self):
  self.config={'per_query':5,'gemini_model':'gemini-3.5-flash-lite'}
  self.topic={'id':'demo','title':'Remotion','query':'remotion claude'}
  self.feed={'items':[{'id':'rss1','title':'Remotion tutorial','summary':'Real source','url':'https://example.com/a','source_name':'Publisher'}]}
 def run_collect(self,providers=(),fake=None,**kw):
  with patch.object(c.time,'sleep'):
   return c.collect(self.config,self.feed,{},[self.topic],set(providers),fake or Fake({}),**kw)
 def test_query_keywords(self):
  self.assertEqual(c.query_text('  remotion  claude '),'remotion claude')
  self.assertEqual(c.query_text('Анимация + Blender'),'Анимация + Blender')
 def test_no_secret_or_shell_query(self):
  for q in ['$(whoami)','https://github.com','x; rm -rf /','private:yes','AIza'+'a'*30,'sk-'+'a'*30,'a','a'*141]:
   with self.subTest(q=q),self.assertRaises(ValueError):c.query_text(q)
 def test_sanitizes_secret_text(self):self.assertEqual(c.clean('api '+'AIza'+'a'*30),'api [секрет скрыт]')
 def test_public_urls(self):
  for url in ['http://example.com','https://127.0.0.1/a','https://a.local/','https://user:pass@example.com','https://localhost/','https://example.com:8443/','javascript:alert(1)']:
   self.assertIsNone(c.public_url(url))
  self.assertEqual(c.public_url('https://github.com/a/b#top'),'https://github.com/a/b')
 def test_no_credentials_no_social_requests(self):
  f=Fake({})
  with patch.dict(os.environ,{},clear=True): public,private=self.run_collect({'x','reddit','gemini'},f,allow_metered=True,approved_reddit=True)
  self.assertEqual(f.calls,[]);self.assertEqual(private,[])
  for name in ['x','reddit','gemini']: self.assertEqual(public['topics'][0]['health'][name]['status'],'needs_key')
 def test_metered_and_approval_gate(self):
  f=Fake({})
  with patch.dict(os.environ,{'X_BEARER_TOKEN':'OWN','REDDIT_ACCESS_TOKEN':'OWN','GEMINI_API_KEY':'OWN'},clear=True):public,_=self.run_collect({'x','reddit','gemini'},f)
  self.assertEqual(f.calls,[])
  self.assertEqual(public['topics'][0]['health']['reddit']['status'],'needs_approval')
  self.assertEqual(public['topics'][0]['health']['x']['status'],'needs_consent')
 def test_offline_no_calls(self):
  f=Fake({});p,private=self.run_collect({'github','x','reddit','gemini'},f,offline=True)
  self.assertEqual(f.calls,[]);self.assertEqual(len(p['topics'][0]['items']),1);self.assertEqual(private,[])
 def test_private_repositories_rejected(self):
  f=Fake({'items':[{'full_name':'a/private','private':True},{'full_name':'a/public','private':False,'description':'Hi'},{'full_name':'../bad','private':False},{'full_name':'a/fork','private':False,'fork':True}]})
  rows,_=c.github(f,'remotion',5)
  self.assertEqual([r['title'] for r in rows],['a/public'])
  self.assertIn('is%3Apublic',f.calls[0][0]);self.assertIn('per_page=5',f.calls[0][0])
 def test_github_incomplete_not_full(self):
  _,incomplete=c.github(Fake({'items':[],'incomplete_results':True}),'remotion',5);self.assertTrue(incomplete)
 def test_error_cannot_leak(self):
  class Fail:
   def json(self,*a):raise RuntimeError('SECRET_TOKEN_ABC123')
  public,_=self.run_collect({'github'},Fail())
  self.assertNotIn('SECRET_TOKEN_ABC123',json.dumps(public));self.assertEqual(public['topics'][0]['health']['github']['status'],'error')
 def test_gemini_only_existing_ids(self):
  f=Fake({'candidates':[{'content':{'parts':[{'text':'["imaginary"]'}]}}]})
  with patch.dict(os.environ,{'GEMINI_API_KEY':'OWN'}),self.assertRaises(RuntimeError):c.gemini_select(f,'remotion',c.local_rows(self.feed,'remotion'),'gemini-3.5-flash-lite')
 def test_gemini_selector_not_summary(self):
  f=Fake({'candidates':[{'content':{'parts':[{'text':'["rss1"]'}]}}]})
  with patch.dict(os.environ,{'GEMINI_API_KEY':'OWN'}):ids=c.gemini_select(f,'remotion',c.local_rows(self.feed,'remotion'),'gemini-3.5-flash-lite')
  self.assertEqual(ids,['rss1']);self.assertNotIn('tools',f.calls[0][2]);self.assertNotIn('OWN',json.dumps(f.calls[0][2]))
 def test_social_never_public(self):
  f=Fake({'data':[{'id':'1234','text':'PRIVATE_REVIEW_TEXT'}]})
  with patch.dict(os.environ,{'X_BEARER_TOKEN':'OWN'},clear=True):public,private=self.run_collect({'x'},f,allow_metered=True)
  self.assertNotIn('PRIVATE_REVIEW_TEXT',json.dumps(public));self.assertIn('PRIVATE_REVIEW_TEXT',json.dumps(private));self.assertNotIn('OWN',json.dumps(private))
 def test_no_redirect(self):self.assertIsNone(c.NoRedirect().redirect_request(None,None,302,'',None,'https://evil.example'))
 def test_api_host_allowlist(self):
  with self.assertRaises(ValueError):c.Client().json('https://evil.example/')
 def test_http_errors_stop_origin(self):
  client=c.Client()
  class Bad:
   def open(self,*a,**kw):raise error.HTTPError('https://api.github.com',429,'key=DO_NOT_ECHO',{},None)
  client.opener=Bad()
  with self.assertRaisesRegex(RuntimeError,'HTTP 429'):client.json('https://api.github.com/search/repositories')
  with self.assertRaisesRegex(RuntimeError,'приостановлен'):client.json('https://api.github.com/search/repositories')
  self.assertEqual(client.calls['api.github.com'],1)
 def test_model_id_no_path_injection(self):
  with self.assertRaises(ValueError):c.gemini_select(Fake({}),'x',[],'../../evil')
 def test_presets_or_custom(self):
  cfg={'topics':[self.topic]};self.assertEqual(c.select_topics(cfg,'demo'),[self.topic]);self.assertTrue(c.select_topics(cfg,'web animation')[0]['id'].startswith('custom-'))
 def test_new_public_payload_has_no_private_queue(self):
  self.assertNotIn('.private',(c.ROOT/'scripts/update.py').read_text())
  collection=json.loads((c.ROOT/'integrations/Motion-Radar.postman_collection.json').read_text())
  self.assertTrue(all(r['value']=='' for r in collection['variable'] if any(k in r['key'] for k in ['api_key','token','user_agent'])))
if __name__=='__main__':unittest.main()
